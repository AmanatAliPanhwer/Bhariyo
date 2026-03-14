import * as tf from '@tensorflow/tfjs';
import { ADJACENCY } from './gameLogic.js';

/**
 * Custom Layer for Adjacency Matrix Multiplication
 */
class AdjacencyLayer extends tf.layers.Layer {
  constructor(config) {
    super(config || {});
    this.adj = config.adj;
  }

  call(inputs) {
    return tf.tidy(() => {
      const x = inputs[0];
      // adj shape: (24, 24), x shape: (batch, 24, hidden)
      // tf.matMul(2D, 3D) performs batch matrix multiplication
      return tf.matMul(this.adj, x);
    });
  }

  computeOutputShape(inputShape) {
    return inputShape;
  }

  static get className() {
    return 'AdjacencyLayer';
  }
}
tf.serialization.registerClass(AdjacencyLayer);

/**
 * Full BhariyoGCN Architecture
 * Equivalent to your Python BhariyoGCN(nn.Module)
 */
export class BhariyoGCN {
  constructor(numResBlocks = 4, numHidden = 64) {
    this.numResBlocks = numResBlocks;
    this.numHidden = numHidden;
    this.normalizedAdj = this.prepareAdj();
    this.model = null;
    this.initModel();
  }

  /**
   * Precompute the Normalized Adjacency Matrix: D^-0.5 * (A + I) * D^-0.5
   */
  prepareAdj() {
    const adj = Array.from({ length: 24 }, () => Array(24).fill(0));
    
    // Create Adjacency Matrix
    Object.entries(ADJACENCY).forEach(([node, neighbors]) => {
      neighbors.forEach(neighbor => {
        adj[node][neighbor] = 1;
      });
    });

    // Add Self-Loops
    for (let i = 0; i < 24; i++) adj[i][i] = 1;

    // Calculate Degrees
    const rowSums = adj.map(row => row.reduce((a, b) => a + b, 0));
    
    // D^-0.5
    const dInvSqrt = rowSums.map(sum => Math.pow(sum, -0.5));
    
    // Normalize: adj_norm = D^-0.5 * adj * D^-0.5
    const normalized = Array.from({ length: 24 }, () => Array(24).fill(0));
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 24; j++) {
        normalized[i][j] = dInvSqrt[i] * adj[i][j] * dInvSqrt[j];
      }
    }

    return tf.tensor2d(normalized);
  }

  initModel() {
    // Input x: (batch, 24, 3) 
    // (Note: In Python you transposed (3, 24) to (24, 3), we'll expect (24, 3) here)
    const input = tf.input({ shape: [24, 3] });

    // Initial embedding: Linear(3, num_hidden)
    let x = tf.layers.dense({ units: this.numHidden, activation: 'relu' }).apply(input);

    // Backbone: GCN blocks with BatchNormalization and Residuals
    for (let i = 0; i < this.numResBlocks; i++) {
      const residual = x;
      
      // Use the custom AdjacencyLayer instead of direct tf.matMul
      x = new AdjacencyLayer({ adj: this.normalizedAdj }).apply(x);
      x = tf.layers.dense({ units: this.numHidden }).apply(x);
      
      // BatchNorm (axis 1 is the node dimension, axis 2 is the features)
      x = tf.layers.batchNormalization().apply(x);
      
      // Residual + ReLU
      x = tf.layers.add().apply([x, residual]);
      x = tf.layers.reLU().apply(x);
    }

    // Flatten for heads
    const xFlat = tf.layers.flatten().apply(x);

    // Policy Head
    let policy = tf.layers.dense({ units: 32, activation: 'relu' }).apply(xFlat);
    const policyOutput = tf.layers.dense({ units: 624, activation: 'softmax', name: 'policy' }).apply(policy);

    // Value Head
    let value = tf.layers.dense({ units: 3, activation: 'relu' }).apply(xFlat);
    const valueOutput = tf.layers.dense({ units: 1, activation: 'tanh', name: 'value' }).apply(value);

    this.model = tf.model({ inputs: input, outputs: [policyOutput, valueOutput] });
  }

  async predict(encodedState) {
    return tf.tidy(() => {
      // encodedState is [24, 3]
      const inputTensor = tf.tensor3d([encodedState]);
      const [policy, value] = this.model.predict(inputTensor);
      
      const pData = policy.dataSync();
      const vData = value.dataSync();
      
      return { policy: pData, value: vData[0] };
    });
  }
}
