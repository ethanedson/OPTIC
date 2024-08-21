const standbyImage = document.getElementById('standbyImage');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const settingsButton = document.getElementById('settings');
const captureButton = document.getElementById('capture');
const flipButton = document.getElementById('flip');
const statusLabel = document.getElementById('status');
const select = document.getElementById('constraints');
const slider = document.getElementById('slider');
const lookupTable = {'brightness':'Brightness','contrast':'Contrast','focusDistance':'Focus Distance','frameRate':'Frame Rate','colorTemperature':'Color Temperature',
                    'iso':'ISO','saturation':'Saturation','sharpness':'Sharpness','exposureCompensation':'Exposure Compensation', 'exposureTime':'Exposure Time'};
const A = document.getElementById('A');
const M = document.getElementById('M');
const switchBox = document.getElementById('switchBox');
const switchToggle = document.getElementById('autoToggle');
const tooltip = document.getElementById('tooltip');
const templates = document.getElementById('templates');
const saveButton = document.getElementById('save');
const buttons = document.getElementsByTagName('button');

var cameraID = '';
var cameraConfig = '';
var currentSelect = '';
var selectLoaded = false;
var capabilities = {};
var currentSettings = {};
var updatedSettings = {};
var settingsOut = [];
var devicePosition = 0;
var deviceOutput = {};
var track;

document.addEventListener('DOMContentLoaded', init, false);

window.onload = async () => {
    try{
        await chrome.storage.local.get(['theme'], (result) => {
            if (result.theme === undefined || result.theme === null || result.theme === ''){
                chrome.storage.local.set({theme: 'dark'}, () => {});
            }
            if (result.theme == 'dark'){
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
                select.style.backgroundColor = '#333333';
                select.style.color = '#ffffff';
                templates.style.backgroundColor = '#333333';
                templates.style.color = '#ffffff';
            }
            else{
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
                select.style.backgroundColor = '#ffffff';
                select.style.color = '#333333';
                templates.style.backgroundColor = '#ffffff';
                templates.style.color = '#333333';
            }
        });
    }
    catch (err){
        console.log('Error: ', err);
    }

    try{
        await chrome.storage.local.get(['configurations'], (result) => {
            if (result.configurations === undefined || result.configurations === null || result.configurations === ''){
                chrome.storage.local.set({configurations: {'custom1':'Custom 1','custom2':'Custom 2','custom3':'Custom 3','custom4':'Custom 4'}}, () => {});
            }
            else{
                let config = result.configurations;
                let i = 3;
                for (let key of ['custom1', 'custom2', 'custom3', 'custom4']){
                    templates[i].textContent = config[key];
                    i+=1;
                }
            }
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
}

async function init(){  
    // Draw standby image to the canvas 
    context.drawImage(standbyImage, 0, 0, canvas.width, canvas.height);

    // Check for available user cameras and create dictionary of deviceIds
    let devices = await navigator.mediaDevices.enumerateDevices();
    deviceOutput = {};
    let y=0;
    for (device of devices){
        if (device.kind == 'videoinput'){
            deviceOutput[y] = device.deviceId;
            y+=1;
        }
    }

    // Check if Auto Connect is enabled
    let ret = await checkAutoConnect();

    try {
        await chrome.storage.local.get(['deviceId'], (result) => {
            cameraID = result.deviceId;
            let possibilities = Object.keys(deviceOutput).map(function(key){return deviceOutput[key];});
            if (possibilities.includes(result.deviceId)){
                devicePosition = Object.keys(deviceOutput).find(key => deviceOutput[key] === result.deviceId);
                if (ret){
                    getMedia(deviceOutput[devicePosition]);
                }
            }
            else{
                if (ret){
                    getMedia(deviceOutput[0]);
                }
            }
        });
    }
    catch (err) {
        console.log('Error: ', err);
    }

    updateTemplate();
    loadSelect();
}

async function updateTemplate(){
    try{
        await chrome.storage.local.get(['currentTemplate'], (result) => {
            if (result.currentTemplate){
                templates.value = result.currentTemplate;
                templates.onchange();
            }
        });
    }
    catch (err) {
        console.log('Error: ', err);
    }
}

async function updateSelect(){
    try{
        await chrome.storage.local.get(['currentSelect'], (result) => {
            if (result.currentSelect != undefined && result.currentSelect != null && result.currentSelect != ""){
                select.value = result.currentSelect;
                select.onchange();
            }
        });
    }
    catch (err) {
        console.log('Error: ', err);
    }
}

function checkAutoConnect(){
    return new Promise((resolve, reject) => {
        try{
            chrome.storage.local.get(['autoConnect'], (result) => {
                if (result.autoConnect == true){
                    resolve(true);
                }
                else{
                    resolve(false);
                }
            });
        }
        catch (err){
            chrome.storage.local.set({autoConnect: false}, () => {
                console.log('Error: ', err);
                resolve(false);
            });
        }
    });
}

async function updateCamera (params) {
    try{
        await track.applyConstraints({advanced: params});
    }
    catch (err){
        //console.error("applyConstraints() failed: ", err);
    }
    switch (select.value){
        case 'Brightness':
            slider.value = updatedSettings['brightness'];
            break;
        case 'Color Temperature':
            slider.value = updatedSettings['colorTemperature'];
            switchToggle.checked = updatedSettings['whiteBalanceMode'] == 'continuous' ? true : false;
            break;
        case 'Contrast':
            slider.value = updatedSettings['contrast'];
            break;
        case 'Exposure Compensation':
            slider.value = updatedSettings['exposureCompensation'];
            break;
        case 'Exposure Time':
            slider.value = updatedSettings['exposureTime'];
            switchToggle.checked = updatedSettings['exposureMode'] == 'continuous' ? true : false;
            break;
        case 'Focus Distance':
            slider.value = updatedSettings['focusDistance'];
            switchToggle.checked = updatedSettings['focusMode'] == 'continuous' ? true : false;
            break;
        case 'Frame Rate':
            slider.value = updatedSettings['frameRate'];
            break;
        case 'ISO':
            slider.value = updatedSettings['iso'];
            break;
        case 'Saturation':
            slider.value = updatedSettings['saturation'];
            break;
        case 'Sharpness':
            slider.value = updatedSettings['sharpness'];
            break;
        }
        currentSelect = Object.keys(lookupTable).find(key => lookupTable[key] === select.value);
}

async function getMedia(deviceId){
    navigator.mediaDevices.getUserMedia({ video: {deviceId: {ideal: deviceId}}}).then((stream) => {
    video.srcObject = stream;
    [track] = stream.getVideoTracks();
    capabilities = track.getCapabilities();
    console.log('Capabilities: ', capabilities);
    currentSettings = track.getSettings();
    console.log('Current Settings: ', currentSettings);
    cameraID = deviceId;
    
    let array = ['deviceId', 'groupId', 'resizeMode', 'facingMode', 'height', 'width', 'aspectRatio'];
    for (let index = 0; index < array.length; index++) {
        delete currentSettings[array[index]];
    }

    Object.keys(currentSettings).forEach(function(keyOut) {
        updatedSettings[keyOut] = currentSettings[keyOut];
     });

    let constraints = Object.keys(capabilities);
    var k, L = select.options.length - 1;
    for(k = L; k >= 0; k--) {
        select.remove(i);
    }
    for(var i = 0; i < constraints.length; i++) {
        if (lookupTable[constraints[i]]){
            var opt = lookupTable[constraints[i]];
            var el = document.createElement("option");
            el.textContent = opt;
            el.value = opt;
            select.appendChild(el);
        }
    }
    document.getElementById('status').textContent = 'Camera Connected';
    setTimeout(() => {document.getElementById('status').textContent = '';}, 2000);
    
  })
  .catch((error) => {
    console.log('Error: ', error);  
    alert('Error accesing webcam: Please connect a camera or enable camera permissions by clicking the "Settings" button');
  });

}

function getStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result);
        });
    });
}

function updateTooltip(value) {
    tooltip.textContent = value;
    const sliderRect = slider.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const thumbWidth = 16; 
    const offset = (sliderRect.width - thumbWidth) * (value - slider.min) / (slider.max - slider.min);
    tooltip.style.left = `${offset + thumbWidth / 2}px`;
}

async function loadDefault(){
    let newConstraint = { advanced: [{}] };
    let possibleOptions = ['brightness', 'contrast', 'saturation', 'iso', 'sharpness', 'exposureCompensation'];
    Object.keys(updatedSettings).forEach(function(keyOut) {
        if (possibleOptions.includes(keyOut)){
            newConstraint.advanced[0][keyOut] = parseInt((capabilities[keyOut].min + capabilities[keyOut].max) / 2);
            updatedSettings[keyOut] = parseInt((capabilities[keyOut].min + capabilities[keyOut].max) / 2);
        }
        else if (keyOut == 'focusDistance'){
            newConstraint.advanced[0]['focusMode'] = 'continuous';
            updatedSettings['focusMode'] = 'continuous';
            //console.log('Setting: ', keyOut, ' to: ', 'continuous');
        }
        else if (keyOut == 'exposureTime'){
            newConstraint.advanced[0]['exposureMode'] = 'continuous';
            updatedSettings['exposureMode'] = 'continuous';
            //console.log('Setting: ', keyOut, ' to: ', 'continuous');
        }
        else if (keyOut == 'colorTemperature'){
            newConstraint.advanced[0]['whiteBalanceMode'] = 'continuous';
            updatedSettings['whiteBalanceMode'] = 'continuous';
            //console.log('Setting: ', keyOut, ' to: ', 'continuous');
        }
    });

    settingsOut = [];
    Object.keys(updatedSettings).forEach(function(keyOut) {
        settingsOut.push({[keyOut]: updatedSettings[keyOut]});
     });

    await updateCamera(settingsOut).catch((err) => {console.log('Error: ', err);});
}

async function loadBW(){
    let newConstraint = { advanced: [{}] };
    let possibleOptions = ['brightness', 'contrast', 'iso', 'sharpness', 'exposureCompensation'];
    Object.keys(updatedSettings).forEach(function(keyOut) {
        if (possibleOptions.includes(keyOut)){
            newConstraint.advanced[0][keyOut] = parseInt((capabilities[keyOut].min + capabilities[keyOut].max) / 2);
            updatedSettings[keyOut] = parseInt((capabilities[keyOut].min + capabilities[keyOut].max) / 2);
        }
        else if (keyOut == 'saturation'){
            newConstraint.advanced[0]['saturation'] = 0;
            updatedSettings['saturation'] = 0;
        }
        else if (keyOut == 'focusDistance'){
            newConstraint.advanced[0]['focusMode'] = 'continuous';
            updatedSettings['focusMode'] = 'continuous';
        }
        else if (keyOut == 'exposureTime'){
            newConstraint.advanced[0]['exposureMode'] = 'continuous';
            updatedSettings['exposureMode'] = 'continuous';
        }
        else if (keyOut == 'colorTemperature'){
            newConstraint.advanced[0]['whiteBalanceMode'] = 'continuous';
            updatedSettings['whiteBalanceMode'] = 'continuous';
        }
    });

    settingsOut = [];
    Object.keys(updatedSettings).forEach(function(keyOut) {
        settingsOut.push({[keyOut]: updatedSettings[keyOut]});
     });

    await updateCamera(settingsOut).catch((err) => {console.log('Error: ', err);});
}

async function loadSepia(){
    let newConstraint = { advanced: [{}] };
    let possibleOptions = ['brightness', 'saturation', 'contrast', 'iso', 'sharpness', 'exposureCompensation'];
    Object.keys(updatedSettings).forEach(function(keyOut) {
        if (possibleOptions.includes(keyOut)){
            newConstraint.advanced[0][keyOut] = parseInt((capabilities[keyOut].min + capabilities[keyOut].max) / 2);
            updatedSettings[keyOut] = parseInt((capabilities[keyOut].min + capabilities[keyOut].max) / 2);
        }
        else if (keyOut == 'focusDistance'){
            newConstraint.advanced[0]['focusMode'] = 'continuous';
            updatedSettings['focusMode'] = 'continuous';
        }
        else if (keyOut == 'exposureTime'){
            newConstraint.advanced[0]['exposureMode'] = 'continuous';
            updatedSettings['exposureMode'] = 'continuous';
        }
        else if (keyOut == 'colorTemperature'){
            newConstraint.advanced[0]['whiteBalanceMode'] = 'manual';
            updatedSettings['whiteBalanceMode'] = 'manual';
            newConstraint.advanced[0]['colorTemperature'] = 6500;
            updatedSettings['colorTemperature'] = 6500;
        }
    });

    settingsOut = [];
    Object.keys(updatedSettings).forEach(function(keyOut) {
        settingsOut.push({[keyOut]: updatedSettings[keyOut]});
     });

    await updateCamera(settingsOut).catch((err) => {console.log('Error: ', err);});
}

function loadSelect(){
    if (select.options.length == 0) {
        setTimeout(loadSelect, 10);
    }
    else {
        updateSelect();
    }
}

captureButton.onclick = () => {
    try{
        chrome.storage.local.get(['deviceId'], (result) => {
            cameraID = result.device
            let possibilities = Object.keys(deviceOutput).map(function(key){return deviceOutput[key];});
            if (possibilities.includes(result.deviceId)){
                devicePosition = Object.keys(deviceOutput).find(key => deviceOutput[key] === result.deviceId);
                getMedia(deviceOutput[devicePosition]);
            }
            else{
                getMedia(deviceOutput[0]);
            }
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
    try{
        chrome.storage.local.get(['currentTemplate'], (result) => {
            if (result.currentTemplate){
                templates.value = result.currentTemplate;
                templates.onchange();
            }
        });
    }
    catch (err){
        console.log('Error: ', err);
    }
}

templates.onchange = async () => {
    try{
        cameraConfig = cameraID + '_' + templates.value;
        //console.log('Camera Config: ', cameraConfig);
        switch (templates.value) {
            case 'default':
                await loadDefault();
                break;
            case 'custom1':
                const custom1Result = await getStorage(cameraConfig);
                //console.log('Custom1: ', custom1Result);
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    // console.log('Key: ', keyOut);
                    // console.log('Value: ', JSON.parse(custom1Result[cameraConfig]));
                    updatedSettings[keyOut] = JSON.parse(custom1Result[cameraConfig])[keyOut];
                });
                break;
            case 'custom2':
                const custom2Result = await getStorage(cameraConfig);
                //console.log('Custom2: ', custom2Result);
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    updatedSettings[keyOut] = JSON.parse(custom2Result[cameraConfig])[keyOut];
                });
                break;
            case 'custom3':
                const custom3Result = await getStorage(cameraConfig);
                //console.log('Custom3: ', custom3Result);
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    updatedSettings[keyOut] = JSON.parse(custom3Result[cameraConfig])[keyOut];
                });
                break;
            case 'custom4':
                const custom4Result = await getStorage(cameraConfig);
                //console.log('Custom4: ', custom4Result);
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    updatedSettings[keyOut] = JSON.parse(custom4Result[cameraConfig])[keyOut];
                });
                break;
            case 'bw':
                await loadBW();
                break;
            case 'sepia':
                await loadSepia();
                break;
        }
    }
    catch (err){
        alert('This configuration has not yet been saved with settings')
    }

    settingsOut = [];
    Object.keys(updatedSettings).forEach(function(keyOut) {
        settingsOut.push({[keyOut]: updatedSettings[keyOut]});
     });

    updateCamera(settingsOut);
    await chrome.storage.local.set({currentTemplate: templates.value}, () => {});

}

saveButton.onclick = async () => {
    cameraConfig = cameraID + '_' + templates.value;
    switch (templates.value){
        case 'default':
            document.getElementById('status').textContent = 'Configuration Locked';
            break;
        case 'custom1':
            await chrome.storage.local.set({[cameraConfig]: JSON.stringify(updatedSettings)}, () => {
                document.getElementById('status').textContent = 'Configuration Saved';
            });
            break;
        case 'custom2':
            await chrome.storage.local.set({[cameraConfig]: JSON.stringify(updatedSettings)}, () => {
                document.getElementById('status').textContent = 'Configuration Saved';
            });
            break;
        case 'custom3':
            await chrome.storage.local.set({[cameraConfig]: JSON.stringify(updatedSettings)}, () => {
                document.getElementById('status').textContent = 'Configuration Saved';
            });
            break;
        case 'custom4':
            await chrome.storage.local.set({[cameraConfig]: JSON.stringify(updatedSettings)}, () => {
                document.getElementById('status').textContent = 'Configuration Saved';
            });
            break;
        case 'bw':
            document.getElementById('status').textContent = 'Configuration Locked';
            break;
        case 'sepia':
            document.getElementById('status').textContent = 'Configuration Locked';
            break;
        }

    setTimeout(() => {document.getElementById('status').textContent = '';}, 2000);
}

flipButton.onclick = async () => {
    devicePosition = (devicePosition + 1) % Object.keys(deviceOutput).length;
    chrome.storage.local.set({deviceId: deviceOutput[devicePosition]}, () => {});
    await getMedia(deviceOutput[devicePosition]);
}
    
settingsButton.onclick = ()=>{
    // Open up a new Chrome Tab with the options page
    chrome.runtime.openOptionsPage(); 
};

select.onchange = async () => {
    try{
        console.log('Select: ', select.value);
        currentSelect = Object.keys(lookupTable).find(key => lookupTable[key] === select.value);
        slider.min = capabilities[currentSelect].min;
        slider.max = capabilities[currentSelect].max;
        slider.step = capabilities[currentSelect].step;
        slider.value = updatedSettings[currentSelect];
        updateTooltip(slider.value);
    }
    catch (err){
        console.log('Error: ', err);
    }
    if (select.value == 'Focus Distance'){
        A.style.display = 'block';
        M.style.display = 'block';
        switchBox.style.display = 'block';
        switchToggle.checked = updatedSettings['focusMode'] == 'continuous' ? true : false;
        }
    else if (select.value == 'Exposure Time'){
        A.style.display = 'block';
        M.style.display = 'block';
        switchBox.style.display = 'block';
        switchToggle.checked = updatedSettings['exposureMode'] == 'continuous' ? true : false;
        }
    else if (select.value == 'Color Temperature'){
        A.style.display = 'block';
        M.style.display = 'block';
        switchBox.style.display = 'block';
        switchToggle.checked = updatedSettings['whiteBalanceMode'] == 'continuous' ? true : false;
        }
    else {
        A.style.display = 'none';
        M.style.display = 'none';
        switchBox.style.display = 'none';
        }
    
    await chrome.storage.local.set({currentSelect: select.value}, () => {});
}

slider.oninput = async event => {
    if (currentSelect === undefined || currentSelect === null || currentSelect === ''){ 
        currentSelect = Object.keys(lookupTable).find(key => lookupTable[key] === select.value);
        syncSelect();
    }
    console.log(currentSelect);
    updateTooltip(slider.value);
    try {
        switch (currentSelect){
            case 'brightness':
                await track.applyConstraints({advanced: [{brightness: parseInt(slider.value)}]});
                updatedSettings['brightness'] = parseInt(slider.value);
                break;
            case 'contrast':
                await track.applyConstraints({advanced: [{contrast: parseInt(slider.value)}]});
                updatedSettings['contrast'] = parseInt(slider.value);
                break;
            case 'focusDistance':
                await track.applyConstraints({advanced: [{focusMode: 'manual', focusDistance: parseInt(slider.value)}]});
                updatedSettings['focusDistance'] = parseInt(slider.value);
                updatedSettings['focusMode'] = 'manual';
                switchToggle.checked = false;
                break;
            case 'frameRate':
                await track.applyConstraints({advanced: [{frameRate: parseInt(slider.value)}]});
                updatedSettings['frameRate'] = parseInt(slider.value);
                break;
            case 'colorTemperature':
                await track.applyConstraints({advanced: [{whiteBalanceMode:'manual', colorTemperature: parseInt(slider.value)}]});
                updatedSettings['colorTemperature'] = parseInt(slider.value);
                updatedSettings['whiteBalanceMode'] = 'manual';
                switchToggle.checked = false;
                break;
            case 'iso':
                await track.applyConstraints({advanced: [{iso: parseInt(slider.value)}]});
                updatedSettings['iso'] = parseInt(slider.value);
                break;
            case 'saturation':
                await track.applyConstraints({advanced: [{saturation: parseInt(slider.value)}]});
                updatedSettings['saturation'] = parseInt(slider.value);
                break;
            case 'sharpness':
                await track.applyConstraints({advanced: [{sharpness: parseInt(slider.value)}]});
                updatedSettings['sharpness'] = parseInt(slider.value);
                break;
            case 'exposureCompensation':
                await track.applyConstraints({advanced: [{exposureCompensation: parseInt(slider.value)}]});
                updatedSettings['exposureCompensation'] = parseInt(slider.value);
                switchToggle.checked = false;
                break;
            case 'exposureTime':
                await track.applyConstraints({advanced: [{exposureMode:'manual', exposureTime: parseInt(slider.value)}]});
                updatedSettings['exposureTime'] = parseInt(slider.value);
                updatedSettings['exposureMode'] = 'manual';
                switchToggle.checked = false;
                break;
        } 
    }
    catch (err) {
        console.error("applyConstraints() failed: ", err);
    }
    };

slider.addEventListener('hover', () => {
    updateTooltip(slider.value);
    });

switchToggle.onchange = async ()=>{
    switch (currentSelect){
        case 'focusDistance':
            try {
                await track.applyConstraints({advanced: [{focusMode: switchToggle.checked ? 'continuous' : 'manual'}]});
                updatedSettings['focusMode'] = switchToggle.checked ? 'continuous' : 'manual';
            } catch (err) {
                console.error("applyConstraints() failed: ", err);
            }
            break;
        case 'exposureTime':
            try {
                await track.applyConstraints({advanced: [{exposureMode: switchToggle.checked ? 'continuous' : 'manual'}]});
                updatedSettings['exposureMode'] = switchToggle.checked ? 'continuous' : 'manual';
            } catch (err) {
                console.error("applyConstraints() failed: ", err);
            }
            break;
        case 'colorTemperature':
            try {
                //console.log(switchToggle.checked ? 'continuous' : 'manual')
                await track.applyConstraints({advanced: [{whiteBalanceMode: switchToggle.checked ? 'continuous' : 'manual'}]});
                updatedSettings['whiteBalanceMode'] = switchToggle.checked ? 'continuous' : 'manual';
            } catch (err) {
                console.error("applyConstraints() failed: ", err);
            }
            break
    }
}

video.addEventListener('play', () => {
    function step() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
});
