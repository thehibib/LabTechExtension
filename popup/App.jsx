import React, {useState, useEffect} from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import './styles.css'

function InitialPop(){
    const navigate = useNavigate();


    //not in use
    const [token, setToken] = useState(null); 
    const [error, setError] = useState(null);

    const getOAuthToken = () => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                setError(chrome.runtime.lastError.message);
            } else {
                setToken(token);
                console.log("OAuth token:", token);
            }
        });
    };

    // TODO: This probably doesn't fully work yet, not sure if it'll change whenever it's loaded
    const [POnum,setPOnum] = useState("")
    useEffect(()=>{
        chrome.storage.local.get(["PO"],(result)=>{
            if (result.PO){
                setPOnum(result.PO)
                console.log('PO WORKED',result.PO, POnum)
            } 
        })

    })

    return(
        //TODO: need to add more styling CSS later on
        <div>
            {/* TODO: set the screen to navigate to later */}
            {/* onClick={() => navigate("")} */}
            {/* <text>
                {POnum}
            </text> */}
            <button className="button">
                {`PO# ${POnum}`}
            </button>

            {/* <button className="button">
                // TODO: have the extension say the name of the page!
                Scrape Page
            </button> */}
            <button className="button" onClick={() => sendQuartzyOrders(setPOnum)}>
                Get Quartzy Orders
            </button>
            <button className="button" onClick={() => navigate("/settings")}>
                Settings
            </button>
            {/* <button className="button" onClick={getOAuthToken}>
                Test Google OAuth
            </button> */}
            {/* TEST TO SHOW STORED API KEY */}
            {/* <button onClick={() => {
                chrome.storage.local.get(['APIKey'], (result) => {
                    alert(result.APIKey);
                });
            }}>
                show API key sillies
            </button> */}
        </div>
    );
}

// Page used for all user entered information
function Settings(){
    const navigate = useNavigate();
    const [POnum,setPOnum] = useState("")
    const [apiKey, setApiKey] = useState("")
    const [spreadSheetID, setSpreadSheetID] = useState("")
    const [sheetID, setSheetID] = useState("")
    const [geminiKey, setGeminiKey] = useState('');
    

    // TODO: Make it red when there's an error with the information entered (set these values in the get and send functions)
    useEffect(()=>{
        chrome.storage.local.get(["PO", "APIKey", "SpreadSheetID", "SheetID"],(result)=>{
            if (result.PO){
                setPOnum(result.PO)
            }
            if (result.APIKey){
                setApiKey(result.APIKey)
            }
            if (result.SpreadSheetID){
                setSpreadSheetID(result.SpreadSheetID)
            }
            if (result.SheetID){
                setSheetID(result.SheetID)
            }
            if (result.geminiApiKey){
                setGeminiKey(result.geminiApiKey)
            }
        })
    }, [])
    
    const hasApiKey = apiKey && apiKey.length > 5;
    const hasSpreadSheetID = spreadSheetID && spreadSheetID.length > 5;
    const hasSheetID = sheetID && sheetID.length > 0;
    const hasPOnum = POnum && POnum.length > 0;
    const hasGeminiApiKey = geminiKey && geminiKey.length > 0;
    // Function to handle storage changes and update local state
    const handleStorageChange = (user_msg, name) => {
        let value = prompt(user_msg);
        if (!value) {return} else if (name === "SpreadSheetID"){
            const trimmedInput = value.trim();
            let spreadsheetId;
            
            // Extract spreadsheet ID
            if (trimmedInput.includes('docs.google.com/spreadsheets')) {
                const match = trimmedInput.match(/\/d\/([a-zA-Z0-9_-]+)/);
                spreadsheetId = match ? match[1] : null;
            } else if (trimmedInput.match(/^[a-zA-Z0-9_-]+$/)) {
                spreadsheetId = trimmedInput;
            }
            if (!spreadsheetId) {
                (alert("invalid spreadhseet ID or Link")); 
                return
            } else {value = spreadsheetId};

        };
        
        chrome.runtime.sendMessage(
            {type: "SET_SOMETHING", item: value, name: name},
            (response) => {
                if (response && response.message) {
                    alert(response.message);
                    // Update local state after successful storage
                    if (name === 'APIKey') {
                        setApiKey(value);
                    } else if (name === 'PO') {
                        setPOnum(value);
                    } else if (name === "SpreadSheetID"){
                        setSpreadSheetID(value)
                    } else if (name === "SheetID"){
                        setSheetID(value)
                    } else if (name === "geminiApiKey"){
                        setGeminiKey(value)
                    }
                }
            }
        );
    };
    
    return(
        <div>
            <button 
                className={`button ${hasApiKey ? 'button-done' : ''}`}
                onClick={() => handleStorageChange('Please enter your Quartzy API key.','APIKey')}
            >
                Change API Key {hasApiKey ? "(done)" : ""}
            </button>
            <button 
                className={`button ${hasSpreadSheetID ? 'button-done' : ''}`}
                onClick={() => handleStorageChange('Please enter your SpreadSheet URL. Example URL: \n https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit?gid=0#gid=0','SpreadSheetID')}
            >
                Change SpreadSheet ID {hasSpreadSheetID ? "(done)" : ""}
            </button>
            <button 
                className={`button ${hasSheetID ? 'button-done' : ''}`}
                onClick={() => handleStorageChange('Please enter the name of your specific sheet WITHIN the SpreadSheet. e.g. Sheet1 ','SheetID')}
            >
                Change Specific Sheet ID {hasSheetID ? "(done)" : ""}
            </button>
            <button 
                className={`button ${hasPOnum ? 'button-done' : ''}`}
                onClick={() => handleStorageChange('Set the current PO#','PO')}
            >
                Set PO# {hasPOnum ? "(done)" : ""}
            </button>
            <button 
                className={`button ${hasGeminiApiKey ? 'button-done' : ''}`}
                onClick={() => handleStorageChange('Enter your Gemini API key (can be gotten for free at https://aistudio.google.com/apikey','geminiApiKey')}
            >
                OPTIONAL Set Gemini API Key {hasGeminiApiKey ? "(done)" : ""}
            </button>
            <button className="button" onClick={() => navigate("/")}>
                Back
            </button>
        </div>
    )
}

// takes message to prompt user and name of what to store the user input as, used for API storage (sheets and quartzy)
// and some other stuff
function changeStorage(user_msg,name){
    const value = prompt(user_msg);
    if (!value) return;
    if (value) {
        chrome.runtime.sendMessage(
            {type: "SET_SOMETHING",item: value,name:name},
            (response) => {
                if (response && response.message){
                    alert(response.message);
                }
            }
        );
    }
}
// calls service worker to use Quartzy API
export function getQuartzyOrders(){
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {type: "FETCH_QUARTZY"},
            (response) => {
                // TODO ADD SOMEKIND OF FEEDBACK IDK
                if (response && response.message){
                    alert(response.message);
                }
                resolve(response.orderData);
            }
        );
    });
}
//asynchronous, so we use await etc.
// sends orders to sheets  (uses getQuartzyOrders)
export async function sendQuartzyOrders(setPOnum) {
    let orders;
    try {
        orders = await getQuartzyOrders();
        console.log("got orders:",orders);        
    } catch (e){
        alert("error fetching orders",e);
        console.error("error fetching orders",e);
    }
    
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(
                {type: "SEND_QUARTZY",data: orders},
                (response) => {
                    // TODO ADD SOMEKIND OF FEEDBACK IDK
                    if (response && response.message){
                        alert(response.message);
                    }
                    chrome.runtime.sendMessage(
                        {type: "INCREASE_PO"},
                        (response) => {
                            console.log("increased PO to",response.PO)
                            setPOnum(response.PO)
                        }
                    )
                    resolve(response.message);
                }
            );
        }catch (e){
            alert("error sending orders",e);
            console.error("error sending orders",e);
            reject(e) //need to manually reject the Promise
        }
    });
}

export default function App(){
    return(
        <Router>
            <Routes>
                <Route path="/" element={<InitialPop/>}/>
                <Route path="/settings" element={<Settings/>}/>
                {/* ADD MORE ROUTES HERE */}
            </Routes>
        </Router>
    );
}