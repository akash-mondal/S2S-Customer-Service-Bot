import React from "react";
import "./App.css";
import 'ldrs/grid';
import { grid } from 'ldrs';

grid.register();

const Loader = () => {
    return (
        <div className="loader-container">
            <l-grid size="60" speed="1.5" color="white"></l-grid>
        </div>
    );
};

export default Loader;