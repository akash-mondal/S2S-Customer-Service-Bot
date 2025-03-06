import streamlit as st
import requests
import os
import time
from typing import List

# --- Configuration ---
API_BASE_URL = "http://0.0.0.0:8000"  # Replace with your API URL
SUPPORTED_FILE_TYPES = {
    "PDF": "application/pdf",
    "DOCX": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "TXT": "text/plain",
    "CSV": "text/csv",
    "PPTX": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

# --- Helper Functions ---

def upload_file(file_path: str, collection_name: str, mime_type: str) -> dict:
    """Uploads a file to the Stella API."""
    url = f"{API_BASE_URL}/upload_local_file/"
    try:
        with open(file_path, "rb") as file:
            files = {"file": (os.path.basename(file_path), file, mime_type)}
            data = {"collection_name": collection_name}
            response = requests.post(url, files=files, data=data, timeout=60)
            response.raise_for_status()
            return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"Error uploading file: {e}")
        return {"error": str(e)}
    except FileNotFoundError:
        st.error(f"File not found: {file_path}")
        return {"error": "File not found"}
    except Exception as e:
         st.error(f"An Unexpected error occured: {e}")
         return {"error":str(e)}



# --- Streamlit UI ---

st.set_page_config(page_title="Stella Uploader", layout="centered")  # Centered layout

st.title("Knowledge Base File Uploader")

# --- Collection Name Input ---
collection_name = st.text_input("Enter Collection Name", "default")
if not collection_name:
    st.warning("Please enter a collection name.")
    st.stop()  # Stop execution if no collection name is provided

# --- File Upload ---
uploaded_files = st.file_uploader(
    "Choose files to upload",
    type=list(SUPPORTED_FILE_TYPES.keys()),
    accept_multiple_files=True,
)

# --- Upload and Verification ---
if uploaded_files:
    st.write("---")  # Separator
    st.subheader("Upload Status")
    for uploaded_file in uploaded_files:
        file_extension = uploaded_file.name.split(".")[-1].upper()
        mime_type = SUPPORTED_FILE_TYPES.get(file_extension)

        if mime_type:
            with st.spinner(f"Uploading and processing {uploaded_file.name}..."):
                # Save temporarily (as before)
                temp_file_path = os.path.join(".", uploaded_file.name)
                with open(temp_file_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())

                try:
                    result = upload_file(temp_file_path, collection_name, mime_type)

                    if "error" not in result:
                        st.success(
                            f"'{uploaded_file.name}' uploaded to '{collection_name}'. Saved as: {result.get('saved_as', 'N/A')}"
                        )


                    else:
                        st.error(f"Upload failed for {uploaded_file.name}: {result['error']}")
                finally:
                    # Clean up
                    try:
                        os.remove(temp_file_path)
                    except:
                        pass

        else:
             st.error(f"Unsupported file type: {file_extension}")
