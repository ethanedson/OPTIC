const permissionsButton = document.getElementById('permissions');
const autoConnectToggle = document.getElementById('autoConnect');
const themeDropdown = document.getElementById('themeDropdown');
const cameraDropdown = document.getElementById('cameraDropdown');
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
        const autoConnect = await getFromStorage('autoConnect');
        autoConnectToggle.checked = autoConnect;

        const theme = await getFromStorage('theme');
        themeDropdown.value = theme;
        if (themeDropdown.value === 'dark'){
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            sidebar.classList.add('dark-mode');
            sidebar.classList.remove('light-mode');
            container.classList.add('dark-mode');
            container.classList.remove('light-mode');
            themeDropdown.style.backgroundColor = '#333333';
            themeDropdown.style.color = '#ffffff';
            cameraDropdown.style.backgroundColor = '#333333';
            cameraDropdown.style.color = '#ffffff';
            }   
        else if (themeDropdown.value === 'light'){
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            sidebar.classList.add('light-mode');
            sidebar.classList.remove('dark-mode');
            container.classList.add('light-mode');
            container.classList.remove('dark-mode');
            themeDropdown.style.backgroundColor = '#ffffff';
            themeDropdown.style.color = '#333333';
            cameraDropdown.style.backgroundColor = '#ffffff';
            cameraDropdown.style.color = '#333333';
            }

        const cameras = await getFromStorage('cameras');
        if (cameras === undefined || cameras === null || cameras === ''){
            chrome.storage.local.set({cameras: {}}, () => {});
        }
        else{
            Object.keys(cameras).forEach(camera => {
                console.log('Camera: ', camera);
                let option = document.createElement('option');
                option.value = camera;
                option.innerHTML = cameras[camera];
                cameraDropdown.appendChild(option);
            });
        }
            
        const deviceId = await getFromStorage('deviceId');
        cameraDropdown.value = deviceId;

        const config = await getFromStorage(cameraDropdown.value + '_configurations'); 
        if (config !== undefined && config !== null && config !== ''){
            for (let key of ['custom1', 'custom2', 'custom3', 'custom4']){
                document.getElementById(key).value = config[key];
            }
        }
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

});

function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}

custom1.addEventListener('focusout', async ()=>{
    try{
        console.log('Var: ', cameraDropdown.value + '_configurations')
        await chrome.storage.local.get([cameraDropdown.value + '_configurations'], (result) => {
            let config = result[cameraDropdown.value + '_configurations'];
            config.custom1 = custom1.value;
            chrome.storage.local.set({[cameraDropdown.value + '_configurations']: config}, () => {});
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
});

custom2.addEventListener('focusout', async ()=>{
    try{
        await chrome.storage.local.get([cameraDropdown.value + '_configurations'], (result) => {
            let config = result[cameraDropdown.value + '_configurations'];
            config.custom2 = custom2.value;
            chrome.storage.local.set({[cameraDropdown.value + '_configurations']: config}, () => {});
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
});

custom3.addEventListener('focusout', async ()=>{
    try{
        await chrome.storage.local.get([cameraDropdown.value + '_configurations'], (result) => {
            let config = result[cameraDropdown.value + '_configurations'];
            config.custom3 = custom3.value;
            chrome.storage.local.set({[cameraDropdown.value + '_configurations']: config}, () => {});
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
});

custom4.addEventListener('focusout', async ()=>{
    try{
        await chrome.storage.local.get([cameraDropdown.value + '_configurations'], (result) => {
            let config = result[cameraDropdown.value + '_configurations'];
            config.custom4 = custom4.value;
            chrome.storage.local.set({[cameraDropdown.value + '_configurations']: config}, () => {});
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
        cameraDropdown.style.backgroundColor = '#333333';
        cameraDropdown.style.color = '#ffffff';
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
        cameraDropdown.style.backgroundColor = '#ffffff';
        cameraDropdown.style.color = '#333333';
        }
    
    try {
        await chrome.storage.local.set({theme: themeDropdown.value});
    } 
    catch (err) {
        console.error("chrome.storage.local.set() failed: ", err);
    }
}

cameraDropdown.onchange = async ()=>{
    try {
        chrome.storage.local.get([cameraDropdown.value + '_configurations'], (config) => {
            config = config[cameraDropdown.value + '_configurations'];
            if (config !== undefined && config !== null && config !== ''){
                for (let key of ['custom1', 'custom2', 'custom3', 'custom4']){
                    document.getElementById(key).value = config[key];
                }
            }
        });
    } 
    catch (err) {
        console.error("chrome.storage.local.set() failed: ", err);
    }
}