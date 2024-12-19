let currentNumber = 0;
let targetNumber = 0;
let isWaitingForCaptcha = false;
let currentToken = null;

const form = document.getElementById('sequence-form');
const formContainer = document.getElementById('form-container');
const sequenceContainer = document.getElementById('sequence-container');
const captchaContainer = document.getElementById('captcha-container');
const errorElement = document.getElementById('error');
const progressElement = document.querySelector('.progress');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function showError(message) {
    errorElement.textContent = message;
}

function updateProgress() {
    progressElement.textContent = `Progression: ${currentNumber}/${targetNumber}`;
}

async function handleCaptchaSuccess(token) {
    console.log('Captcha résolu avec succès');
    currentToken = token;
    isWaitingForCaptcha = false;
    captchaContainer.innerHTML = '';

    await continueSequence();
}

function handleCaptchaError(error) {
    console.error('Erreur captcha:', error);
    showError('Erreur lors de la validation du captcha. Veuillez réessayer.');
    captchaContainer.innerHTML = '';
}

function showCaptcha() {
    isWaitingForCaptcha = true;

    AwsWafCaptcha.renderCaptcha(captchaContainer, {
        apiKey: import.meta.env.VITE_WAF_API_KEY,
        onSuccess: handleCaptchaSuccess,
        onError: handleCaptchaError
    });
}

// Fonction pour effectuer une requête API
async function makeRequest() {
    try {
        const headers = new Headers();
        if (currentToken) {
            headers.append('X-AWS-WAFTOKEN', currentToken);
        }

        const response = await fetch('https://api.prod.jcloudify.com/whoami', {
            headers: headers
        });

        if (response.status === 403 || response.status === 405) {
            const wafAction = response.headers.get('x-amzn-waf-action');
            if (wafAction === 'captcha') {
                showCaptcha();
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Erreur lors de la requête:', error);
        showError('Erreur lors de la requête API');
        return false;
    }
}

async function addSequenceLine() {
    currentNumber++;
    sequenceContainer.textContent += `${currentNumber}. Forbidden\n`;
    sequenceContainer.scrollTop = sequenceContainer.scrollHeight;
    updateProgress();
}

async function continueSequence() {
    while (currentNumber < targetNumber) {
        if (isWaitingForCaptcha) {
            return;
        }

        const success = await makeRequest();
        if (!success) {
            if (!isWaitingForCaptcha) {
                formContainer.style.display = 'block';
                return;
            }
            break;
        }

        await addSequenceLine();

        if (currentNumber < targetNumber) {
            await sleep(1000);
        }
    }

    if (currentNumber >= targetNumber) {
        captchaContainer.innerHTML = '';
        formContainer.style.display = 'block';
        progressElement.textContent = 'Séquence terminée!';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = document.getElementById('number');
    const number = parseInt(input.value);

    if (isNaN(number) || number < 1 || number > 1000) {
        showError('Veuillez entrer un nombre entre 1 et 1000');
        return;
    }

    errorElement.textContent = '';
    formContainer.style.display = 'none';
    sequenceContainer.textContent = '';
    captchaContainer.innerHTML = '';
    currentNumber = 0;
    targetNumber = number;
    isWaitingForCaptcha = false;
    currentToken = null;

    updateProgress();
    await continueSequence();
});