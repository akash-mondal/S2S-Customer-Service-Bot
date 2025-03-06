import nest_asyncio
import os
import json
import sqlite3
import time
import math
from urllib.parse import urlparse
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel, HttpUrl
from llama_parse import LlamaParse
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_cohere import CohereEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.schema import Document as LangchainDocument
from typing import List, Optional
from pathlib import Path
from groq import Groq
import requests
from urllib.parse import urlparse
from io import BytesIO
import tempfile
from fastapi.responses import JSONResponse
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from office365.runtime.auth.client_credential import ClientCredential
from office365.sharepoint.client_context import ClientContext
from office365.sharepoint.files.file import File
import boto3
from botocore.exceptions import ClientError
from langchain_groq import ChatGroq
import yfinance as yf
from langchain_core.tools import tool
from datetime import date, timedelta
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage, ToolMessage
import logging
from fastapi.middleware.cors import CORSMiddleware
nest_asyncio.apply()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Hardcoded API keys (replace with environment variables in production)
GROQ_API_KEY = ""
LLAMAPARSE_API_KEY = ""
COHERE_API_KEY = ""


llm = ChatGroq(groq_api_key=GROQ_API_KEY, model='qwen-2.5-32b')
app = FastAPI()

# ADDED CORS MIDDLEWARE CONFIGURATION
origins = [
    "http://localhost:3000",
    # "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


@tool
def get_stock_info(symbol, key):
    """
    Return the correct stock info value given the appropriate symbol and key.
    (See full list of valid keys in original code)

    If asked generically for 'stock price', use currentPrice
    """
    data = yf.Ticker(symbol)
    stock_info = data.info
    return stock_info[key]

@tool
def get_historical_price(symbol, start_date, end_date):
    """
    Fetches historical stock prices for a given symbol from 'start_date' to 'end_date'.
    - symbol (str): Stock ticker symbol.
    - end_date (date): Typically today unless a specific end date is provided.
                      End date MUST be greater than start date
    - start_date (date): Set explicitly, or calculated as 'end_date - date interval'
                        (for example, if prompted 'over the past 6 months',
                         date interval = 6 months so start_date would be 6 months
                         earlier than today's date). Default to '1900-01-01'
                         if vaguely asked for historical price. Start date must
                         always be before the current date
    """
    data = yf.Ticker(symbol)
    hist = data.history(start=start_date, end=end_date)
    hist = hist.reset_index()
    hist[symbol] = hist['Close']
    return hist[['Date', symbol]]
tools = [get_stock_info, get_historical_price]
llm_with_tools = llm.bind_tools(tools)

def get_stock_analysis(user_prompt):
    system_prompt = 'You are a helpful finance assistant that analyzes stocks and stock prices. Today is {today}'.format(today=date.today())
    messages = [SystemMessage(system_prompt), HumanMessage(user_prompt)]
    ai_msg = llm_with_tools.invoke(messages)
    messages.append(ai_msg)

    for tool_call in ai_msg.tool_calls:
        selected_tool = {"get_stock_info": get_stock_info, "get_historical_price": get_historical_price}[tool_call["name"].lower()]
        tool_output = selected_tool.invoke(tool_call["args"])
        messages.append(ToolMessage(str(tool_output), tool_call_id=tool_call["id"]))

    return llm_with_tools.invoke(messages).content

class StockAnalysisModel(BaseModel):
    query: str

# In-memory chat history storage
chat_history_store = {}
MAX_HISTORY_LENGTH = 5

def manage_chat_history(user_id: str, session_id: str, message: str):
    """
    Manages chat history in memory.  Stores up to MAX_HISTORY_LENGTH messages
    per user/session combination.  Logs messages.
    """
    key = f"{user_id}:{session_id}"
    if key not in chat_history_store:
        chat_history_store[key] = []

    if message:  # Only add non-empty messages
        chat_history_store[key].append(message)
        logger.info(f"User: {user_id}, Session: {session_id}, Message: {message}")

    # Keep only the last MAX_HISTORY_LENGTH messages
    chat_history_store[key] = chat_history_store[key][-MAX_HISTORY_LENGTH:]

    # Return the history in chronological order (oldest first)
    return "\n".join(chat_history_store[key])

# Initialize global variables
vs_dict = {}

# Define a directory to store uploaded files
UPLOAD_DIRECTORY = "uploaded_files"

# Ensure the upload directory exists
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# New Pydantic model for link processing
class LinkProcessModel(BaseModel):
    link: HttpUrl
    collection_name: str
    process_all: bool = True
    file_name: Optional[str] = None

def determine_service(url):
    domain = urlparse(url).netloc
    if 'drive.google.com' in domain:
        return 'google_drive'
    elif 'sharepoint.com' in domain:
        return 'sharepoint'
    elif 's3.amazonaws.com' in domain:
        return 'amazon_s3'
    elif 'box.com' in domain:
        return 'box'
    else:
        return 'unknown'
# Initialize the Groq client
client = Groq(api_key=GROQ_API_KEY)



# Helper function to load and parse the input data
def mariela_parse(files):
    parser = LlamaParse(
        api_key=LLAMAPARSE_API_KEY,
        result_type="markdown",
        verbose=True
    )
    parsed_documents = []
    for file in files:
        parsed_documents.extend(parser.load_data(file))
    return parsed_documents

# Create vector database
def mariela_create_vector_database(parsed_documents, collection_name):
    langchain_docs = [
        LangchainDocument(page_content=doc.text, metadata=doc.metadata)
        for doc in parsed_documents
    ]

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=5000, chunk_overlap=100)
    docs = text_splitter.split_documents(langchain_docs)

    embed_model = CohereEmbeddings(model="embed-multilingual-v3.0", cohere_api_key=COHERE_API_KEY)

    vs = Chroma.from_documents(
        documents=docs,
        embedding=embed_model,
        persist_directory="chroma_db",
        collection_name=collection_name
    )

    return vs

# Function to manage chat history

def process_google_drive(link, process_all, file_name=None):
    # This is a simplified version. In a real scenario, you'd need to handle OAuth 2.0
    #  Replace 'path/to/credentials.json' with your actual credentials file path.
    credentials = Credentials.from_authorized_user_file('path/to/credentials.json')
    drive_service = build('drive', 'v3', credentials=credentials)

    file_id = link.split('/')[-1]
    if process_all:
        results = drive_service.files().list(q=f"'{file_id}' in parents", fields="files(id, name)").execute()
        files = results.get('files', [])
    else:
        files = [{'id': file_id, 'name': file_name}]

    downloaded_files = []
    for file in files:
        request = drive_service.files().get_media(fileId=file['id'])
        fh = BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
        fh.seek(0)
        downloaded_files.append((file['name'], fh))

    return downloaded_files

# Function to process SharePoint
def process_sharepoint(link, process_all, file_name=None):
    # You'd need to set up authentication with client credentials  Replace with your actual credentials
    client_credentials = ClientCredential("YOUR_SHAREPOINT_CLIENT_ID", "YOUR_SHAREPOINT_CLIENT_SECRET")
    ctx = ClientContext(link).with_credentials(client_credentials)

    if process_all:
        folder = ctx.web.get_folder_by_server_relative_url(link)
        files = folder.files
        ctx.load(files)
        ctx.execute_query()
    else:
        files = [File.from_url(ctx, f"{link}/{file_name}")]

    downloaded_files = []
    for file in files:
        content = file.read()
        downloaded_files.append((file.properties['Name'], BytesIO(content)))

    return downloaded_files

# Function to process Amazon S3
def process_s3(link, process_all, file_name=None):
    # Replace with your AWS credentials.  Recommended to use environment variables or IAM roles.
    s3 = boto3.client('s3')
    bucket_name, key = link.split('/', 3)[2:]

    if process_all:
        objects = s3.list_objects_v2(Bucket=bucket_name, Prefix=key)['Contents']
    else:
        objects = [{'Key': f"{key}/{file_name}"}]

    downloaded_files = []
    for obj in objects:
        file = BytesIO()
        s3.download_fileobj(bucket_name, obj['Key'], file)
        file.seek(0)
        downloaded_files.append((obj['Key'].split('/')[-1], file))

    return downloaded_files
# Endpoint models
class FileUploadModel(BaseModel):
    filepath: str
    collection_name: str

class QueryModel(BaseModel):
    collection_name: str
    query: str
    user_id: str
    session_id: str

class TransformationModel(BaseModel):
    user_query: str


@app.post("/use_api/")
async def stock_analysis(data: StockAnalysisModel):
    user_query = data.query
    analysis = get_stock_analysis(user_query)
    return {"analysis": analysis}

# Endpoint: Single file upload
@app.post("/upload_file/")
async def upload_file(data: FileUploadModel):
    global vs_dict
    filepath = data.filepath
    collection_name = data.collection_name

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File {filepath} not found")

    parsed_documents = mariela_parse([filepath])
    vs = mariela_create_vector_database(parsed_documents, collection_name)

    vs_dict[collection_name] = vs
    return {"message": f"File uploaded, parsed, and stored in collection: {collection_name}"}

# Endpoint: Directory upload
@app.post("/upload_directory/")
async def upload_directory(data: FileUploadModel):
    global vs_dict
    directory = data.filepath
    collection_name = data.collection_name

    if not os.path.exists(directory) or not os.path.isdir(directory):
        raise HTTPException(status_code=404, detail=f"Directory {directory} not found")

    files = [str(file) for file in Path(directory).glob("*") if file.is_file()]
    if not files:
        raise HTTPException(status_code=400, detail=f"No valid files found in {directory}")

    parsed_documents = mariela_parse(files)
    vs = mariela_create_vector_database(parsed_documents, collection_name)

    vs_dict[collection_name] = vs
    return {"message": f"Directory uploaded, parsed, and stored in collection: {collection_name}"}
@app.post("/process_db/")
async def process_corporate_link(data: LinkProcessModel):
    service = determine_service(str(data.link))
    if service == 'unknown':
        raise HTTPException(status_code=400, detail="Unsupported file hosting service")

    try:
        if service == 'google_drive':
            files = process_google_drive(str(data.link), data.process_all, data.file_name)
        elif service == 'sharepoint':
            files = process_sharepoint(str(data.link), data.process_all, data.file_name)
        elif service == 'amazon_s3':
            files = process_s3(str(data.link), data.process_all, data.file_name)

        processed_files = []
        for file_name, file_content in files:
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file.write(file_content.getvalue())
                temp_file_path = temp_file.name

            parsed_documents = mariela_parse([temp_file_path])
            vs = mariela_create_vector_database(parsed_documents, f"{data.collection_name}_{file_name}")

            vs_dict[f"{data.collection_name}_{file_name}"] = vs
            processed_files.append(file_name)

            os.unlink(temp_file_path)

        return {
            "message": f"Files from {service} processed and stored in collections",
            "processed_files": processed_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file(s): {str(e)}")

@app.post("/upload_local_file/")
async def upload_local_file(
    file: UploadFile = File(...),
    collection_name: str = Form(...)
):
    """
    Endpoint to handle file uploads from user's local machine.
    """
    try:
        # Create a unique filename to avoid overwriting
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{collection_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)

        # Save the file locally
        with open(file_path, "wb") as buffer:
            contents = await file.read()
            buffer.write(contents)

        # Process the saved file
        parsed_documents = mariela_parse([file_path])
        vs = mariela_create_vector_database(parsed_documents, collection_name)
        vs_dict[collection_name] = vs

        return JSONResponse(content={
            "message": f"File '{file.filename}' uploaded and processed successfully.",
            "collection_name": collection_name,
            "saved_as": unique_filename
        }, status_code=200)
    except Exception as e:
        logger.error(f"Error processing uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {e}")

# Endpoint: Retrieval
@app.post("/retrieve/")
async def retrieve(data: QueryModel):
    global vs_dict
    collection_name = data.collection_name
    query = data.query

    if collection_name not in vs_dict:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")

    vs = vs_dict[collection_name]
    results = vs.similarity_search(query, k=4)

    formatted_results = []
    for i, doc in enumerate(results, 1):
        formatted_results.append({
            "result_number": i,
            "page_content": doc.page_content,
            "metadata": doc.metadata
        })

    return {"results": formatted_results}

# Query Transformation
@app.post("/query_transformation/")
async def query_transformation(data: TransformationModel):
    user_query = data.user_query

    system_message = """
    You are an advanced assistant that breaks down complex questions into simpler sub-questions.
    Your goal is to take a user query and generate 4 sub-queries that will help answer the original question.
    Return the sub-queries in the following JSON format:

    {
        "sub_queries": [
            {"sub_query_1": "<first sub-question>"},
            {"sub_query_2": "<second sub-question>"},
            {"sub_query_3": "<third sub-question>"},
            {"sub_query_4": "<fourth sub-question>"}
        ]
    }
    """

    messages = [
        {
            "role": "system",
            "content": system_message
        },
        {
            "role": "user",
            "content": f"Generate 4 sub-questions for the query: '{user_query}'"
        }
    ]

    completion = client.chat.completions.create(
        model="llama-3.2-1b-preview",
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
        top_p=1,
        stream=False,
        response_format={"type": "json_object"},
        stop=None,
    )

    sub_queries_json = completion.choices[0].message.content

    return json.loads(sub_queries_json)

# Function to generate follow-up question
def generate_followup_question(user_query: str, retrieved_docs: str):
    system_message_followup = """
    You are a helpful voice assistant designed to generate a clarifying follow-up question to improve the understanding of a user's initial query.
    Based on the user's initial question and the provided documents, identify any ambiguities or areas where more specific information would be helpful.
    Formulate a single, clear and concise follow-up question to ask the user. LIMIT YOURSELF TO ONLY A 30-40 Words at max since this is a voice conversation
    The follow-up question should help narrow down the user's intent and allow for a more precise and helpful answer in the subsequent turn.
    If the initial query is already clear and specific, or if the documents provide sufficient context, you can ONLY respond with: "No follow-up question needed."
    """

    context = f"Documents:\n{retrieved_docs}"

    messages = [
        {
            "role": "system",
            "content": system_message_followup
        },
        {
            "role": "user",
            "content": f"Initial User query: {user_query}\n\nContext:\n{context}"
        }
    ]

    completion = client.chat.completions.create(
        model="qwen-2.5-32b", # Or a lighter model if needed for speed
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
        top_p=1,
        stream=False,
        stop=None,
    )

    followup_question = completion.choices[0].message.content.strip()
    return followup_question


# Query answering function with chat history
def query_answer(user_query: str, retrieved_docs: str, user_id: str, session_id: str):
    chat_history = manage_chat_history(user_id, session_id, f"Q: {user_query}")
    system_message = f"""
    IMPORTANT  YOU SHOULD REFER TO CHAT HISTORY AND FIGURE OUT IF USER QUERY IS ACTUALLY A FOLLOW UP ANSWER TO YOUR QUESTION . 
    You are an advanced voice based customer service bot that provides answers based on the given product documents and chat history. 
    User can ask to questions which might need reference to the documents or previous chat history , so do some reasoning and form an answer
    If the answer to the user's query is not explicitly present in the product documents or chat history, respond to user asking a question which will provide you with clarity to answer and server better
    Do not provide any answers from your general knowledge, only use the given product documents and chat history.
    you can also use the information retrieved to place orders , but for that you must have users address and name noted down and also item name, users phone number is always {user_id}
    if you dont have the stated information while placing order (from document or previous conversation), ask for those and proceed , after enough data is avaliable , speak out the details of the order and confirm it as placed and cash on delivery
    since this is a voice based conversatation limit your answer to 50 words at maximum , also dont include \n in your answers or format it , it should be pure raw text
    also try to help users because they will be asking a lot about features and comparisions , try to be as useful as possible without asking a followup question everytime , after you found the perfect product , say its name out and maybe ask if user has question regarding that product 
    """

    context = f"Chat History (previous questions and answers):\n{chat_history}\n\nDocuments:\n{retrieved_docs}"

    messages = [
        {
            "role": "system",
            "content": system_message
        },
        {
            "role": "user",
            "content": f"User query: {user_query}\n\nContext:\n{context}"
        }
    ]

    completion = client.chat.completions.create(
        model="qwen-2.5-32b",
        messages=messages,
        temperature=0.7,
        max_tokens=2048,
        top_p=1,
        stream=False,
        stop=None,
    )

    answer = completion.choices[0].message.content
    manage_chat_history(user_id, session_id, f"A: {answer}")

    return answer

# Grounding agent function
def grounding_agent(answer, question, context, user_id, session_id):
    chat_history = manage_chat_history(user_id, session_id, "")
    grounding_system_message = """
    You are a grounding agent. Your task is to evaluate the given answer based on the provided question and context.
    You must return a JSON object in the following format:
    {
        "is_hallucinated": 0 or 1,  # 0 means the answer is grounded, 1 means it is hallucinated
        "explanation": "A brief explanation of why the answer is or is not hallucinated"
    }
    Analyze if the answer is directly derived from the provided documents.
    """
    full_context = f"Chat History (previous questions and answers):\n{chat_history}\n\nContext: {context}"
    messages = [
        {
            "role": "system",
            "content": grounding_system_message
        },
        {
            "role": "user",
            "content": f"Question: {question}\n{full_context}\nAnswer: {answer}"
        }
    ]

    completion = client.chat.completions.create(
        model="qwen-2.5-32b",
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
        top_p=1,
        stream=False,
        response_format={"type": "json_object"},
        stop=None,
    )

    grounding_result_str = completion.choices[0].message.content
    return json.loads(grounding_result_str)

# Chat endpoint
@app.post("/chat/")
async def chat(data: QueryModel):
    collection_name = data.collection_name
    user_query = data.query
    user_id = data.user_id
    session_id = data.session_id

    if collection_name not in vs_dict:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")

    vs = vs_dict[collection_name]
    results = vs.similarity_search(user_query, k=5)
    retrieved_docs = "\n\n".join([doc.page_content for doc in results])


    chat_key = f"{user_id}:{session_id}"
    is_first_turn = chat_key not in chat_history_store or not chat_history_store[chat_key]

    if is_first_turn:
        followup_question = generate_followup_question(user_query, retrieved_docs)
        if "No follow-up question needed." in followup_question:
            answer = query_answer(user_query, retrieved_docs, user_id, session_id)
            return {
                "original_query": user_query,
                "answer": answer,
                "followup_question": None
            }
        else:
            return {
                "original_query": user_query,
                "answer": followup_question,
                "followup_question": followup_question
            }
    else:
        answer = query_answer(user_query, retrieved_docs, user_id, session_id)
        return {
            "original_query": user_query,
            "answer": answer,
            "followup_question": None
        }
