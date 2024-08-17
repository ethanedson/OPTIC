const permissionsButton = document.getElementById('permissions');
const autoConnectToggle = document.getElementById('autoConnect');
const themeDropdown = document.getElementById('themeDropdown');

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

themeDropdown.onchange = async ()=>{
    if (themeDropdown.value === 'dark'){
        console.log('Dark theme selected');
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        }   
    else if (themeDropdown.value === 'light'){
        console.log('Light theme selected');
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        }
    
    try {
        await chrome.storage.local.set({theme: themeDropdown.value});
    } 
    catch (err) {
        console.error("chrome.storage.local.set() failed: ", err);
    }
}

function updateSettings(){
    try{
        chrome.storage.local.get(['autoConnect'], (result) => {
            autoConnectToggle.checked = result.autoConnect;
        });
        chrome.storage.local.get(['theme'], (result) => {
            themeDropdown.value = result.theme;
            if (themeDropdown.value === 'dark'){
                console.log('Dark theme selected');
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
                }   
            else if (themeDropdown.value === 'light'){
                console.log('Light theme selected');
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
                }
        });
        
    }
    catch (err){
        console.error("chrome.storage.local.get() failed: ", err);
    }
}
