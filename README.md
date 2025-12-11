# Pop-up (automatic when on recognized websites)
Spec: Displays PO#, which increments when data is sent. 
Has the option to send data to sheets, when clicked runs the data pipeline from quartzy -> extension processing backend -> sheets.
Data is sent as such:
item name,vendor,catalog#,quantity,price per unit,total price,order author,PO number, unique order id (to avoid duplicates)

# Settings & Authentication
Spec: Menu that allows the user to the enter information required to use APIs, like Quartzy and Sheets. Buttons turn green when at least some information has been entered.

# User Manual for Updating and Running
This extension is written in React JS and uses Vite to compile. This means that everything is written in jsx and uses Vite to turn this into pure JavaScript that the extension can use. The /dist folder is the jsx->js code. To update /dist run: npm run build.

This extension is barebones on purpose, as the goal of the extension is to be as simple and long-lasting as possible. All data processing happens in the service workers, the App.jsx is only used for sending appropriate data to the service worker and calling the service worker. The data pipeline gets order information from Quartzy's API, sorts and cleans up these orders, then sends them to Google Sheets. UI is not overcomplicated and there aren’t excessive “data review” pages. Everything ends up in sheets, where users can review and manage information, this is only to speed up data entry.


# Sheets API
Create a new google cloud project. APIs & Services -> Library. Find and enable the Sheets API. APIs & Services -> OAuth Consent Screen. Pick external, add Google Sheets Scope. APIs & Services -> OAuth Client ID. Pick “Google Extension,” enter the extension ID (found in the extension’s settings). Add client_id to the manifest. 


# Future Agenda
Process orders from "ORDERED" instead of "RECIEVED" (issue with Quartzy API).
Add dates (also issue with API returning seemingly incorrect dates).
Add ability to get orders from other providers with AI.
 