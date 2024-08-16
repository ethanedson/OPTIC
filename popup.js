const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const settingsButton = document.getElementById('settings');
const captureButton = document.getElementById('capture');
const flipButton = document.getElementById('flip');
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

var cameraID = '';
var currentSetting = {}; 
var capabilities = {};
var currentSettings = {};
var updatedSettings = {};
var settingsOut = [];
var devicePosition = 0;
var deviceOutput = {};
var track;
var faceBox = {};

document.addEventListener('DOMContentLoaded', init, false);

window.onload = async () => {
    const MODEL_URL = '/models'
    Promise.all([
        await faceapi.loadSsdMobilenetv1Model(MODEL_URL),
        await faceapi.loadFaceLandmarkModel(MODEL_URL),
        await faceapi.loadFaceRecognitionModel(MODEL_URL),
    ]);
}

async function init(){  
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
}

async function getMedia(deviceId){
    navigator.mediaDevices.getUserMedia({ video: {deviceId: {ideal: deviceId}}}).then((stream) => {
    video.srcObject = stream;
    [track] = stream.getVideoTracks();
    capabilities = track.getCapabilities();
    console.log('Capabilities: ', capabilities);
    currentSettings = track.getSettings();
    
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
    
  })
  .catch((error) => {
    console.log('Error: ', error);  
    alert('Error accesing webcam: Please connect a camera or enable camera permissions by clicking the "Settings" button');
  });

  //faceUpdater();
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

async function faceUpdater(){
    faceBox = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    console.log(faceBox);
    setTimeout(faceUpdater, 1000); // here
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
        switch (templates.value) {
            case 'default':
                await loadDefault();
                break;
            case 'custom1':
                const custom1Result = await getStorage('custom1');
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    updatedSettings[keyOut] = JSON.parse(custom1Result.custom1)[keyOut];
                });
                break;
            case 'custom2':
                const custom2Result = await getStorage('custom2');
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    updatedSettings[keyOut] = JSON.parse(custom2Result.custom2)[keyOut];
                });
                break;
            case 'custom3':
                const custom3Result = await getStorage('custom3');
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    updatedSettings[keyOut] = JSON.parse(custom3Result.custom3)[keyOut];
                });
                break;
            case 'custom4':
                const custom4Result = await getStorage('custom4');
                Object.keys(updatedSettings).forEach(function(keyOut) {
                    updatedSettings[keyOut] = JSON.parse(custom4Result.custom4)[keyOut];
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

    select.onchange();
}

saveButton.onclick = async () => {
    switch (templates.value){
        case 'default':
            break;
        case 'custom1':
            await chrome.storage.local.set({custom1: JSON.stringify(updatedSettings)}, () => {
                console.log(JSON.stringify(updatedSettings));
            });
            break;
        case 'custom2':
            await chrome.storage.local.set({custom2: JSON.stringify(updatedSettings)}, () => {
                console.log(JSON.stringify(updatedSettings));
            });
            break;
        case 'custom3':
            await chrome.storage.local.set({custom3: JSON.stringify(updatedSettings)}, () => {
                console.log(JSON.stringify(updatedSettings));
            });
            break;
        case 'custom4':
            await chrome.storage.local.set({custom4: JSON.stringify(updatedSettings)}, () => {
                console.log(JSON.stringify(updatedSettings));
            });
            break;
        case 'bw':
            break;
        case 'sepia':
            break;
        }
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

select.onchange = () => {
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
    try{
        currentSetting = Object.keys(lookupTable).find(key => lookupTable[key] === select.value);
        slider.min = capabilities[currentSetting].min;
        slider.max = capabilities[currentSetting].max;
        slider.step = capabilities[currentSetting].step;
        slider.value = updatedSettings[currentSetting];
        updateTooltip(slider.value);
    }
    catch (err){
        console.log('Error: ', err);
    }
}

slider.oninput = async event => {
    updateTooltip(slider.value);
    try {
        switch (currentSetting){
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
    switch (currentSetting){
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
                console.log(switchToggle.checked ? 'continuous' : 'manual')
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
        try{
            context.strokeStyle = 'red';
            context.lineWidth = 2;
            //console.log(faceBox);
            //context.strokeRect(faceBox.detection.box._x, faceBox.detection.box._y, faceBox.detection.box._width, faceBox.detection.box._height);
        }
        catch (err){
            console.log('Error: ', err);
        }
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
});
