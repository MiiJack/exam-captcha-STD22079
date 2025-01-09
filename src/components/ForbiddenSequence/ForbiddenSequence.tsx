import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import styles from './ForbiddenSequence.module.css';

export const ForbiddenSequence: React.FC = () => {
    const [currentNumber, setCurrentNumber] = useState(0);
    const [targetNumber, setTargetNumber] = useState(0);
    const [isWaitingForCaptcha, setIsWaitingForCaptcha] = useState(false);
    const [currentToken, setCurrentToken] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [sequence, setSequence] = useState<string[]>([]);
    const [showForm, setShowForm] = useState(true);
    const sequenceRef = useRef<HTMLDivElement>(null);
    const captchaVerifiedRef = useRef(false);

    useEffect(() => {
        if (sequenceRef.current) {
            sequenceRef.current.scrollTop = sequenceRef.current.scrollHeight;
        }
    }, [sequence]);

    useEffect(() => {
        let isMounted = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        const continueSequence = async () => {
            if (currentNumber >= targetNumber || isWaitingForCaptcha || !isMounted) {
                return;
            }

            if (isWaitingForCaptcha && !captchaVerifiedRef.current) {
                return;
            }

            try {
                await apiService.makeRequest(currentToken || undefined);

                if (isMounted) {
                    setCurrentNumber(prev => prev + 1);
                    setSequence(prev => [...prev, `${currentNumber + 1}. Forbidden`]);

                    if (currentNumber + 1 < targetNumber) {
                        timeoutId = setTimeout(continueSequence, 1000);
                    } else {
                        setShowForm(true);
                    }
                }
            } catch (error: any) {
                console.error('Sequence error:', error);

                if (error.is405 && isMounted && !captchaVerifiedRef.current) {
                    setIsWaitingForCaptcha(true);
                    showCaptcha();
                } else if (error.status === 400 && isMounted) {
                    setError('Captcha verification failed. Please try again.');
                    setIsWaitingForCaptcha(true);
                    captchaVerifiedRef.current = false;
                    refreshCaptcha();
                } else if (isMounted) {
                    setError(`${error.message || 'Error making API request'} (Status: ${error.status || 'unknown'})`);
                    setShowForm(true);
                }
            }
        };

        if (targetNumber > 0) {
            continueSequence();
        }

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [currentNumber, targetNumber, isWaitingForCaptcha, currentToken]);


    const handleCaptchaSuccess = async (token: string) => {
        console.log('Captcha token received, length:', token.length);
        try {
            setCurrentToken(token);
            setIsWaitingForCaptcha(false);
            captchaVerifiedRef.current = true;

            // Clear the captcha container after successful verification
            const captchaContainer = document.getElementById('captcha-container');
            if (captchaContainer) {
                captchaContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Error handling captcha success:', error);
            setError('Failed to verify captcha. Please try again.');
            captchaVerifiedRef.current = false;
            refreshCaptcha();
        }
    };

    const handleCaptchaError = (error: Error) => {
        console.error('Captcha error:', error);
        setError('Captcha validation failed. Please try again.');
        setIsWaitingForCaptcha(true);
        captchaVerifiedRef.current = false;
        refreshCaptcha();
    };

    const showCaptcha = () => {
        if (captchaVerifiedRef.current) {
            return;
        }

        const captchaContainer = document.getElementById('captcha-container');
        if (!captchaContainer) {
            console.error('Captcha container not found');
            setError('Error initializing captcha');
            return;
        }

        if (!window.AwsWafCaptcha) {
            console.error('AWS WAF Captcha not loaded');
            setError('Error loading captcha service. Please refresh the page.');
            return;
        }

        try {
            captchaContainer.innerHTML = '';

            window.AwsWafCaptcha.renderCaptcha(captchaContainer, {
                apiKey: import.meta.env.VITE_WAF_API_KEY,
                onSuccess: handleCaptchaSuccess,
                onError: handleCaptchaError
            });
        } catch (error) {
            console.error('Error rendering captcha:', error);
            setError('Failed to render captcha. Please refresh the page.');
        }
    };

    const refreshCaptcha = () => {
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            captchaContainer.innerHTML = '';
        }
        captchaVerifiedRef.current = false;
        showCaptcha();
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const number = parseInt(formData.get('number') as string);

        if (isNaN(number) || number < 1 || number > 1000) {
            setError('Please enter a number between 1 and 1000');
            return;
        }

        setError('');
        setShowForm(false);
        setSequence([]);
        setCurrentNumber(0);
        setTargetNumber(number);
        setIsWaitingForCaptcha(false);
        setCurrentToken(null);
        captchaVerifiedRef.current = false;
    };

    return (
        <div className={styles.container}>
            {showForm && (
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formContent}>
                        <label htmlFor="number">Enter a number (1-1000):</label>
                        <input
                            type="number"
                            id="number"
                            name="number"
                            min="1"
                            max="1000"
                            required
                            className={styles.input}
                        />
                        <button type="submit" className={styles.button}>
                            Start Sequence
                        </button>
                    </div>
                </form>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.gridContainer}>
                <div className={styles.sequenceCard}>
                    <div ref={sequenceRef} className={styles.sequenceContent}>
                        {sequence.join('\n')}
                    </div>
                </div>

                <div className={styles.captchaCard}>
                    <div id="captcha-container" />
                </div>
            </div>

            <div className={styles.progress}>
                {targetNumber > 0 &&
                    (currentNumber >= targetNumber
                        ? 'Sequence completed!'
                        : `Progress: ${currentNumber}/${targetNumber}`)}
            </div>
        </div>
    );
};