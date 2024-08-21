const permissionsButton = document.getElementById('permissions');
const autoConnectToggle = document.getElementById('autoConnect');
const themeDropdown = document.getElementById('themeDropdown');
const tabs = document.querySelectorAll('.sidebar li');
const contents = document.querySelectorAll('.tab-content');
const sidebar = document.querySelector('.sidebar');
const container = document.querySelector('.container');
const custom1 = document.getElementById('custom1');
const custom2 = document.getElementById('custom2');
const custom3 = document.getElementById('custom3');
const custom4 = document.getElementById('custom4');

document.addEventListener('DOMContentLoaded', async function() {
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
                sidebar.classList.add('dark-mode');
                sidebar.classList.remove('light-mode');
                container.classList.add('dark-mode');
                container.classList.remove('light-mode');
                themeDropdown.style.backgroundColor = '#333333';
                themeDropdown.style.color = '#ffffff';
                }   
            else if (themeDropdown.value === 'light'){
                console.log('Light theme selected');
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
                sidebar.classList.add('light-mode');
                sidebar.classList.remove('dark-mode');
                container.classList.add('light-mode');
                container.classList.remove('dark-mode');
                themeDropdown.style.backgroundColor = '#ffffff';
                themeDropdown.style.color = '#333333';
                }
        });
        
    }
    catch (err){
        console.error("chrome.storage.local.get() failed: ", err);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.getAttribute('data-tab');
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === target) {
                    content.classList.add('active');
                }
            });
        });
    });

    try{
        await chrome.storage.local.get(['configurations'], (result) => {
            if (result.configurations === undefined || result.configurations === null || result.configurations === ''){
                chrome.storage.local.set({configurations: {'custom1':'Custom 1','custom2':'Custom 2','custom3':'Custom 3','custom4':'Custom 4'}}, () => {});
            }
            else{
                let config = result.configurations;
                let i = 1;
                for (let key of ['custom1', 'custom2', 'custom3', 'custom4']){
                    document.getElementById(key).value = config[key];
                }
            }
        });
    }
    catch (err){
        console.log('Error: ', err);
    }

});

custom1.addEventListener('change', async ()=>{
    try{
        await chrome.storage.local.get(['configurations'], (result) => {
            let config = result.configurations;
            config.custom1 = custom1.value;
            chrome.storage.local.set({configurations: config}, () => {});
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
});

custom2.addEventListener('change', async ()=>{
    try{
        await chrome.storage.local.get(['configurations'], (result) => {
            let config = result.configurations;
            config.custom2 = custom2.value;
            chrome.storage.local.set({configurations: config}, () => {});
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
});

custom3.addEventListener('change', async ()=>{
    try{
        await chrome.storage.local.get(['configurations'], (result) => {
            let config = result.configurations;
            config.custom3 = custom3.value;
            chrome.storage.local.set({configurations: config}, () => {});
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
});

custom4.addEventListener('change', async ()=>{
    try{
        await chrome.storage.local.get(['configurations'], (result) => {
            let config = result.configurations;
            config.custom4 = custom4.value;
            chrome.storage.local.set({configurations: config}, () => {});
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
});

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
        sidebar.classList.add('dark-mode');
        sidebar.classList.remove('light-mode');
        container.classList.add('dark-mode');
        container.classList.remove('light-mode');
        themeDropdown.style.backgroundColor = '#333333';
        themeDropdown.style.color = '#ffffff';
        }   
    else if (themeDropdown.value === 'light'){
        console.log('Light theme selected');
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        sidebar.classList.add('light-mode');
        sidebar.classList.remove('dark-mode');
        container.classList.add('light-mode');
        container.classList.remove('dark-mode');
        themeDropdown.style.backgroundColor = '#ffffff';
        themeDropdown.style.color = '#333333';
        }
    
    try {
        await chrome.storage.local.set({theme: themeDropdown.value});
    } 
    catch (err) {
        console.error("chrome.storage.local.set() failed: ", err);
    }
}