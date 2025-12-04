async function checkWebsiteWithAI(url){
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    
    if (!geminiApiKey) {
        // console.log("No GeminiAPI key found");
        return false;
    }

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
            {
                method: "POST",
                headers: {
                    "x-goog-api-key": geminiApiKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Is this URL for ordering biology or chemistry materials/supplies? Examples include: Quartzy (app.quartzy.com with requests?status[]=PENDING), Flinn Scientific, Fisher Scientific, Sigma-Aldrich. Answer ONLY with the word 'true' or 'false', nothing else. URL: ${url}`
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();
        console.log("Full API response:", data);
        
        const result = data.candidates[0].content.parts[0].text.toLowerCase().trim();
        const decision = result.includes('true');
        
        console.log(`AI check for ${url}: ${decision}`);
        return decision;
    } catch (error) {
        console.error("Error using Gemini API:", error);
        return false;
    }
}


chrome.tabs.onCreated.addListener((tab) =>{
    console.log("New tab!",tab)
});

// Opens the extension automatically when on the order page of recognized URLs
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab) => {
    console.log("worked")
    //we want to see if the tab has been properly loaded, of course
    if (changeInfo.status == "complete" && tab.url){
        console.log("tab done loading",tab.url);
        let tabParts = tab.url.split("/");
        console.log(tabParts);
        //idk if this is useful, but it's definitely nice
        let quartzyCheck = tabParts.includes("app.quartzy.com") && tabParts.includes("requests?status[]=PENDING")
        console.log("includes quartzy?",tabParts.includes("quartzy.com"))
        console.log("includes pending?",tabParts.includes("requests?status[]=PENDING"))
        if (quartzyCheck){
            chrome.action.openPopup()
                .then(() => console.log("popup opened!"))
                .catch(err => console.error("ERROR:",err))
        } else { //TODO: add FLINN!!
            checkWebsiteWithAI(tab.url)
            .then (response => {
                if (typeof response !== Boolean){
                    return false
                } else {
                    return true
                }
            }).then(response => {
                if (response){
                    chrome.action.openPopup()
                } 
            }).catch(err => console.error("ERROR:",err))

        }
    };
});

//request is the actual content of the message
chrome.runtime.onMessage.addListener((request,sender,sendResponse) => {
    // HANDLING ALL STORAGE
    if (request.type === "SET_SOMETHING"){
        //2nd arg is a callback function once stored
        let name = request.name
        chrome.storage.local.set({[name]: request.item}, () => {
            console.log(`${name} stored.`)
            sendResponse({message: `${name} stored successfully!`})
        });
        //need this to keep the connection open??
        return true;
    }

    // HANDLING CALLING QUARTZY API
    if (request.type === "FETCH_QUARTZY"){
        chrome.storage.local.get(['APIKey'], (result) =>{
            //getting order data
            const url = 'https://api.quartzy.com/order-requests'
            console.log(result.APIKey)
            orderData = fetch(url, {
                method: 'GET',
                headers: {
                    'Access-Token': result.APIKey 
                }
            })
                .then(response => {
                    if (!response.ok){
                        throw new Error("Error fetching Quartzy data:", response.error)
                    }
                    return response.json()})
                .then(data => {
                    
                    console.log("Full Quartzy API response:", data);
                    //trimming order data
                    const receivedOrders = data.filter(order => order.status === "RECEIVED");
                    console.log(receivedOrders)
                    sendResponse({'orderData': receivedOrders});
                })
                .catch((err) => {
                    console.error(err);
                    sendResponse({ message: err.message});
                });

        });
        return true;
    }

    // HANDLING SENDING QUARTZY DATA TO SHEETS
    if (request.type === "SEND_QUARTZY"){
        QuartzyToSheet(request.data)
            .then(() => {
                sendResponse({message: "Orders uploaded!"})
            })
            .catch((err) => {
                console.error(err);
                sendResponse({ message: err.message});
            });
        return true;
    }
    if (request.type === "INCREASE_PO") {

        chrome.storage.local.get(["PO"], (result) => {
            const oldPO = result.PO ?? 0;
            const newPO = parseInt(oldPO) + 1;

            chrome.storage.local.set({ PO: newPO }, () => {
                sendResponse({ PO: newPO });
            });
        });

        // keep message channel open
        return true;
    }
});


// Authenticates user, sends inputted data to a google sheet (also given by the user)
// theoretically can send anything to sheets as long as its a JSON array of arrays
// and the sub array contains the desired elements
async function QuartzyToSheet(orderData){
    
    const authToken = await new Promise((resolve,reject) => {
        chrome.identity.getAuthToken({ interactive: true }, function(authToken) {
         if (chrome.runtime.lastError){
            reject(chrome.runtime.lastError)
         } else {
            resolve(authToken)
         }
        })
    });

    const POforSheets = await new Promise((resolve,reject) => {
        chrome.storage.local.get(['PO'], (result) => {
            if (chrome.runtime.lastError){
                reject(chrome.runtime.lastError)
            }else{
                resolve(result.PO)
            }
        });
    });


    const {SpreadSheetID} = await chrome.storage.local.get(['SpreadSheetID'])
    const {SheetID} = await chrome.storage.local.get(['SheetID'])
    const SPREADSHEET_ID = SpreadSheetID;
    const SHEET_NAME = SheetID;


    const orderRows = orderData.map(order => [
        // THIS IS WHERE WE DECIDE THE FORMATTING OF DATA ENTRY
        order.item_name,
        order.vendor_name,
        order.catalog_number,
        order.quantity,
        order.unit_price,
        order.total_price
            ? (parseFloat(order.total_price.amount) / 100).toFixed(2)
            : "",
        order.created_by ? order.created_by.email : "",
        // CHANGE THIS TO BE ACCURATE TO THE DESIRED PO#
        POforSheets || "",
        order.id
    ]);
    //Order ID MUST BE THE LAST COLUMN
    const headers = ["Item Name", "Vendor Name", "Catalog Number", "Quantity", "Unit Price", "Total Price", "Order Created By", "PO Number", "Order ID (For Duplicate Order Verification)"]
    const numOfColumns = headers.length;
    const finalColumn = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'][headers.length - 1]
    const idRange = `${SHEET_NAME}!${finalColumn}1:${finalColumn}`

    // First, get existing ID's from the sheet
    const existingDataResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${idRange}`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        }
    );

    const existingData = await existingDataResponse.json();
    const weirdExistingOrderIds = existingData.values || [];
    const existingOrderIds = weirdExistingOrderIds.flat();

    console.log("Order Rows: ", orderRows);
    console.log("Existing Rows: ", existingOrderIds);

    let rows = []
    if (existingOrderIds.length == 0){
        rows.push(headers, ...orderRows)
    } else {
        
        for (let i = 0; i < orderRows.length; i++){
            let duplicate = false;
            for (let z = 1; z < existingOrderIds.length; z++){ 
                //checking if same order ID
                if (existingOrderIds[z] == orderRows[i][numOfColumns-1]){
                    duplicate = true;
                }

            }
            if (!duplicate) {rows.push(orderRows[i])};
        }
    }
    console.log("Rows: ", rows)
    const dataBody = {
        values: rows
    };

    // CALLING SHEETS API
    // https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append#authorization-scopes
    const appendRange = `${SHEET_NAME}!A:A`; // This tells Sheets to find the next empty row automatically
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${appendRange}:append?valueInputOption=USER_ENTERED`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dataBody)
        }
    )

    const result = await response.json();
    console.log(result);
}