import * as ort from 'onnxruntime-web';

/**
 * Expert Model: ONNX Model Handler
 * Loads and runs the provided bhariyo_model.onnx
 */
export class BhariyoONNXModel {
    constructor() {
        this.session = null;
        this.modelUrl = '/src/assets/bhariyo_model.onnx'; // Adjust path if necessary
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        try {
            // Load the session
            this.session = await ort.InferenceSession.create(this.modelUrl, {
                executionProviders: ['webgl', 'wasm'],
                graphOptimizationLevel: 'all'
            });
            this.initialized = true;
            console.log('%c [EXPERT AI] ONNX Model Initialized Successfully', 'color: #00ff00; font-weight: bold;');
        } catch (error) {
            console.error('Failed to initialize ONNX model:', error);
            // Fallback: If WebGL fails, try WASM only
            try {
                this.session = await ort.InferenceSession.create(this.modelUrl, {
                    executionProviders: ['wasm']
                });
                this.initialized = true;
            } catch (fallbackError) {
                console.error('ONNX WASM Fallback failed:', fallbackError);
            }
        }
    }

    async predict(encodedState) {
        if (!this.initialized) await this.init();

        // encodedState is [24, 3] from gameLogic.js
        // We need to reshape to [1, 3, 24] for the Conv1d layers (Batch, Channels, Length)
        // Conv1d expects (N, C, L)
        const flatData = new Float32Array(3 * 24);
        
        // Transpose [24, 3] -> [3, 24]
        for (let i = 0; i < 24; i++) {
            flatData[i] = encodedState[i][0];       // Channel 0: Empty
            flatData[i + 24] = encodedState[i][1];  // Channel 1: P1
            flatData[i + 48] = encodedState[i][2];  // Channel 2: P2
        }

        const inputTensor = new ort.Tensor('float32', flatData, [1, 3, 24]);

        try {
            const feeds = { input: inputTensor }; // The input name in your ResNet forward is typically 'input' or 'x'
            // If you're unsure of input name, onnxruntime will throw error showing valid names
            const results = await this.session.run(feeds);
            
            // Output names are usually 'policyHead' and 'valueHead' or indexed if not named
            // Based on your ResNet Python code: policyHead and valueHead
            const policyData = results[Object.keys(results)[0]].data; 
            const valueData = results[Object.keys(results)[1]].data;

            return { 
                policy: policyData, 
                value: valueData[0] 
            };
        } catch (error) {
            console.error('ONNX Prediction error:', error);
            // If names are wrong, let's log the keys to find the correct ones
            if (this.session) {
                console.log('Available output names:', Object.keys(await this.session.outputNames));
            }
            return { policy: new Float32Array(624).fill(1/624), value: 0 };
        }
    }
}
