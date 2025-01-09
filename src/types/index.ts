export interface CaptchaCallbacks {
    onSuccess: (token: string) => void;
    onError: (error: Error) => void;
}

declare global {
    interface Window {
        AwsWafCaptcha: {
            renderCaptcha: (
                element: HTMLElement,
                config: {
                    apiKey: string;
                    onSuccess: (token: string) => void;
                    onError: (error: Error) => void;
                }
            ) => void;
        };
    }
}