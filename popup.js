const standbyImage = document.getElementById('standbyImage');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const settingsButton = document.getElementById('settings');
const coffeeButton = document.getElementById('coffee');
const COFFEE_LICENSE_URL = 'https://edsonresearchsystems.gumroad.com/l/coffee'
const captureButton = document.getElementById('capture');
const flipButton = document.getElementById('flip');
const statusLabel = document.getElementById('status');
const lookupTable = {'brightness':'Brightness','contrast':'Contrast','focusDistance':'Focus Distance','frameRate':'Frame Rate','colorTemperature':'Color Temperature',
                    'iso':'ISO','saturation':'Saturation','sharpness':'Sharpness','exposureCompensation':'Exposure Compensation', 'exposureTime':'Exposure Time'};
const controlsList = document.getElementById('constraintControls');
const controlElements = new Map();
const AUTO_MODE_CONFIG = {
    focusDistance: { modeKey: 'focusMode', autoValue: 'continuous', manualValue: 'manual' },
    exposureTime: { modeKey: 'exposureMode', autoValue: 'continuous', manualValue: 'manual' },
    colorTemperature: { modeKey: 'whiteBalanceMode', autoValue: 'continuous', manualValue: 'manual' }
};
const ORDERED_CONSTRAINTS = ['brightness','contrast','saturation','sharpness','iso','exposureCompensation','exposureTime','colorTemperature','focusDistance','frameRate'];
const EXCLUDED_CONSTRAINTS = new Set(['height','width','aspectRatio']);
const templates = document.getElementById('templates');
const saveButton = document.getElementById('save');
const buttons = document.getElementsByTagName('button');

var cameraID = '';
var cameraLabel = '';
var cameraConfig = '';
var capabilities = {};
var currentSettings = {};
var updatedSettings = {};
var settingsOut = [];
var devicePosition = 0;
var deviceOutput = {};
var track;
var showLabel = false;
var labelBrightness = 0;

function clampToCapability(key, value) {
    if (!capabilities || !capabilities[key]) {
        return Number(value);
    }
    const cap = capabilities[key];
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
        return numericValue;
    }
    const min = typeof cap.min === 'number' ? cap.min : numericValue;
    const max = typeof cap.max === 'number' ? cap.max : numericValue;
    return Math.min(max, Math.max(min, numericValue));
}

function hasNumericRange(capability) {
    return capability && typeof capability.min === 'number' && typeof capability.max === 'number';
}

function formatConstraintLabel(key) {
    if (lookupTable[key]) {
        return lookupTable[key];
    }
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
}

function formatConstraintDisplayValue(key, value) {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
        return '';
    }
    if (key === 'focusDistance') {
        return numericValue.toFixed(2);
    }
    if (key === 'frameRate') {
        return numericValue.toFixed(1);
    }
    if (key === 'exposureTime') {
        return Math.round(numericValue).toString();
    }
    return Number.isInteger(numericValue) ? numericValue.toString() : numericValue.toFixed(2);
}

function updateConstraintValueDisplay(key, value) {
    const control = controlElements.get(key);
    if (!control) {
        return;
    }
    control.value.textContent = formatConstraintDisplayValue(key, value);
}

function syncConstraintUI() {
    controlElements.forEach((control, key) => {
        const cap = capabilities[key];
        if (!cap) {
            control.slider.disabled = true;
            return;
        }
        const storedValue = updatedSettings[key];
        if (storedValue !== undefined) {
            const clamped = clampToCapability(key, storedValue);
            if (control.slider.value !== String(clamped)) {
                control.slider.value = clamped;
            }
            updateConstraintValueDisplay(key, clamped);
        } else {
            updateConstraintValueDisplay(key, control.slider.value);
        }
        const config = AUTO_MODE_CONFIG[key];
        if (config && control.toggle) {
            const modeValue = updatedSettings[config.modeKey];
            const isAuto = modeValue === config.autoValue;
            control.toggle.checkbox.checked = !!isAuto;
            control.slider.disabled = !!isAuto;
            if (isAuto) {
                control.toggle.wrapper.classList.add('disabled');
            } else {
                control.toggle.wrapper.classList.remove('disabled');
            }
        }
    });
}

async function handleAutoToggleChange(key, isAuto) {
    const config = AUTO_MODE_CONFIG[key];
    if (!config || !track) {
        return;
    }
    const constraint = { advanced: [{}] };
    constraint.advanced[0][config.modeKey] = isAuto ? config.autoValue : config.manualValue;
    if (!isAuto) {
        const sliderValue = Number(controlElements.get(key)?.slider.value ?? updatedSettings[key] ?? capabilities[key]?.min ?? 0);
        constraint.advanced[0][key] = sliderValue;
        updatedSettings[key] = sliderValue;
    }
    try {
        await track.applyConstraints(constraint);
        const latestSettings = track.getSettings();
        if (latestSettings && typeof latestSettings[key] !== 'undefined') {
            updatedSettings[key] = latestSettings[key];
        }
        updatedSettings[config.modeKey] = isAuto ? config.autoValue : config.manualValue;
    } catch (err) {
        console.error('applyConstraints() failed: ', err);
    }
    syncConstraintUI();
}

async function applyConstraintForKey(key, value) {
    if (!track) {
        return;
    }
    const numericValue = clampToCapability(key, value);
    if (Number.isNaN(numericValue)) {
        return;
    }
    const constraint = { advanced: [{}] };
    const config = AUTO_MODE_CONFIG[key];
    if (config) {
        constraint.advanced[0][config.modeKey] = config.manualValue;
        updatedSettings[config.modeKey] = config.manualValue;
    }
    constraint.advanced[0][key] = numericValue;
    let appliedValue = numericValue;
    try {
        await track.applyConstraints(constraint);
        const latestSettings = track.getSettings();
        if (latestSettings && typeof latestSettings[key] !== 'undefined') {
            appliedValue = latestSettings[key];
        }
        updatedSettings[key] = appliedValue;
    } catch (err) {
        console.error('applyConstraints() failed: ', err);
        updatedSettings[key] = numericValue;
    }
    updateConstraintValueDisplay(key, appliedValue);
    syncConstraintUI();
}

function renderConstraintControls() {
    if (!controlsList) {
        return;
    }
    controlsList.innerHTML = '';
    controlElements.clear();
    if (!capabilities) {
        return;
    }
    const prioritized = ORDERED_CONSTRAINTS.filter((key) => hasNumericRange(capabilities[key]) && !EXCLUDED_CONSTRAINTS.has(key));
    const additional = Object.keys(capabilities).filter((key) => hasNumericRange(capabilities[key]) && !EXCLUDED_CONSTRAINTS.has(key) && !prioritized.includes(key));
    additional.sort((a, b) => formatConstraintLabel(a).localeCompare(formatConstraintLabel(b)));
    const keys = [...prioritized, ...additional];
    if (keys.length === 0) {
        const message = document.createElement('p');
        message.className = 'no-constraints';
        message.textContent = 'No adjustable camera constraints were reported.';
        controlsList.appendChild(message);
        return;
    }
    const groupContainer = document.createElement('div');
    groupContainer.className = 'constraint-group';
    controlsList.appendChild(groupContainer);

    keys.forEach((key) => {
        const control = createConstraintControl(key, capabilities[key]);
        if (control) {
            groupContainer.appendChild(control.container);
            controlElements.set(key, control);
        }
    });
    syncConstraintUI();
}

function createConstraintControl(key, capability) {
    if (!hasNumericRange(capability) || EXCLUDED_CONSTRAINTS.has(key)) {
        return null;
    }
    const container = document.createElement('div');
    container.className = 'constraint-row';

    const header = document.createElement('div');
    header.className = 'constraint-header';

    const label = document.createElement('span');
    label.className = 'constraint-label';
    label.textContent = formatConstraintLabel(key);
    header.appendChild(label);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'constraint-value';
    header.appendChild(valueDisplay);

    container.appendChild(header);

    const rangeWrapper = document.createElement('div');
    rangeWrapper.className = 'range-wrapper';

    const range = document.createElement('input');
    range.type = 'range';
    range.min = capability.min;
    range.max = capability.max;
    range.step = capability.step && capability.step > 0 ? capability.step : 1;
    range.value = capability.min;
    rangeWrapper.appendChild(range);
    container.appendChild(rangeWrapper);

    let toggleElements = null;
    if (AUTO_MODE_CONFIG[key]) {
        const autoWrapper = document.createElement('div');
        autoWrapper.className = 'auto-toggle';

        const autoLabel = document.createElement('span');
        autoLabel.textContent = 'Auto';

        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        const sliderSpan = document.createElement('span');
        sliderSpan.className = 'slider round';

        switchLabel.appendChild(checkbox);
        switchLabel.appendChild(sliderSpan);
        autoWrapper.appendChild(autoLabel);
        autoWrapper.appendChild(switchLabel);
        rangeWrapper.appendChild(autoWrapper);

        checkbox.addEventListener('change', async () => {
        try {
            await handleAutoToggleChange(key, checkbox.checked);
        } catch (err) {
            console.error('applyConstraints() failed: ', err);
        }
    });

        toggleElements = { wrapper: autoWrapper, checkbox };
    }

    range.addEventListener('input', async () => {
        updateConstraintValueDisplay(key, range.value);
        if (toggleElements && toggleElements.checkbox.checked) {
            toggleElements.checkbox.checked = false;
            try {
                await handleAutoToggleChange(key, false);
            } catch (err) {
                console.error('applyConstraints() failed: ', err);
            }
        }
        try {
            await applyConstraintForKey(key, range.value);
        } catch (err) {
            console.error('applyConstraints() failed: ', err);
        }
    });

    return { container, slider: range, value: valueDisplay, toggle: toggleElements };
}
document.addEventListener('DOMContentLoaded', init, false);

window.onload = async () => {
    try{
        await chrome.storage.local.get(['theme'], (result) => {
            if (result.theme === undefined || result.theme === null || result.theme === ''){
                chrome.storage.local.set({theme: 'dark'}, () => {});
                result.theme = 'dark';
            }
            if (result.theme == 'dark'){
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
                templates.style.backgroundColor = '#333333';
                templates.style.color = '#ffffff';
            }
            else{
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
                templates.style.backgroundColor = '#ffffff';
                templates.style.color = '#333333';
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

async function updateCamera(params){
    try {
        await track.applyConstraints({advanced: params});
    }
    catch (err){
        //console.error("applyConstraints() failed: ", err);
    }
    syncConstraintUI();
}

async function getMedia(deviceId){
    navigator.mediaDevices.getUserMedia({ video: {deviceId: {ideal: deviceId}}}).then((stream) => {
    video.srcObject = stream;
    [track] = stream.getVideoTracks();
    capabilities = track.getCapabilities();
    currentSettings = track.getSettings();
    updatedSettings = {};
    cameraID = deviceId;
    chrome.storage.local.set({deviceId: deviceId}, () => {});
    
    cameraLabel = track.label;
    //console.log('Camera Label: ', cameraLabel);
    
    // code to check local storage cameras variable to see if devicID id is in there
    chrome.storage.local.get(['cameras'], (result) => {
        if (result.cameras === undefined || result.cameras === null || result.cameras === ''){
            chrome.storage.local.set({cameras: {[cameraID]:cameraLabel}}, () => {});
        }
        else{
            let camerasDict = result.cameras;
            if (!Object.keys(camerasDict).includes(cameraID)){
                camerasDict[cameraID] = cameraLabel;
                chrome.storage.local.set({cameras: camerasDict}, () => {});
            }
        }
    });

    try{
        chrome.storage.local.get([cameraID + '_configurations'], (result) => {
            if (result[cameraID + '_configurations'] === undefined || result[cameraID + '_configurations'] === null || result[cameraID + '_configurations'] === ''){
                chrome.storage.local.set({[cameraID + '_configurations']: {'custom1':'Custom 1','custom2':'Custom 2','custom3':'Custom 3','custom4':'Custom 4'}}, () => {});
            }
            else{
                let config = result[cameraID + '_configurations'];
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
    
    let array = ['deviceId', 'groupId', 'resizeMode', 'facingMode', 'height', 'width', 'aspectRatio'];
    for (let index = 0; index < array.length; index++) {
        delete currentSettings[array[index]];
    }

    Object.keys(currentSettings).forEach(function(keyOut) {
        updatedSettings[keyOut] = currentSettings[keyOut];
     });

    renderConstraintControls();
    setTimeout(() => {showLabel = true;}, 500);
    setTimeout(() => {fontBrighten();},500);
    setTimeout(() => {fontDarken();}, 4500);
    setTimeout(() => {showLabel = false;}, 5000);
    
  })
  .catch((error) => {
    console.log('Error: ', error);  
    alert('Error accesing webcam: Please connect a camera or enable camera permissions by clicking the "Settings" button');
  });

}

function fontBrighten(){
    if (labelBrightness >= 1){
        return;
    }
    labelBrightness += 0.05;
    setTimeout(fontBrighten,25);
}

function fontDarken(){
    if (labelBrightness <= 0){
        return;
    }
    labelBrightness -= 0.05;
    setTimeout(fontDarken, 25);
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
        if (keyOut != 'deviceLabel'){
            settingsOut.push({[keyOut]: updatedSettings[keyOut]});
        }
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

coffeeButton.onclick = () => {
    chrome.tabs.create({url: COFFEE_LICENSE_URL});
}


function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
    context.fill();
}

video.addEventListener('play', () => {
    function step() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (showLabel){
            context.font = '16px Arial';
            context.fillStyle = 'rgba(0, 0, 0, ' + String(labelBrightness/2) + ')';
            roundRect(context, 7, 7, context.measureText(cameraLabel).width + 20, 30, 8);
            context.fillStyle = 'rgba(255, 255, 255, ' + String(labelBrightness) + ')';
            context.fillText(cameraLabel, 17, 28);
        }
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
});






































