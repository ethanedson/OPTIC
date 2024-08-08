const permissionsButton = document.getElementById('permissions');
const autoConnectToggle = document.getElementById('autoConnect');

document.addEventListener('DOMContentLoaded', updateSettings, false);

permissionsButton.onclick = async ()=>{
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        alert('Camera permissions succesfully enabled');
    } catch (err) {
        console.error("navigator.mediaDevices.getUserMedia() failed: ", err);
    }
}

autoConnectToggle.onchange = async ()=>{
    try {
        await chrome.storage.local.set({autoConnect: autoConnectToggle.checked});
    } catch (err) {
        console.error("chrome.storage.local.set() failed: ", err);
    }
}

function updateSettings(){
    try{
        chrome.storage.local.get(['autoConnect'], (result) => {
            autoConnectToggle.checked = result.autoConnect;
        });
    }
    catch (err){
        console.error("chrome.storage.local.get() failed: ", err);
    }
}
