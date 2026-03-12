import * as tf from '@tensorflow/tfjs';

/**
 * ResBlock in TensorFlow.js
 * Equivalent to your Python ResBlock(nn.Module)
 */
class ResBlock {
  constructor(numHidden) {
    this.numHidden = numHidden;
    this.conv1 = tf.layers.conv1d({ filters: numHidden, kernelSize: 3, padding: 'same' });
    this.bn1 = tf.layers.batchNormalization();
    this.conv2 = tf.layers.conv1d({ filters: numHidden, kernelSize: 3, padding: 'same' });
    this.bn2 = tf.layers.batchNormalization();
  }

  apply(x) {
    const residual = x;
    let out = this.conv1.apply(x);
    out = this.bn1.apply(out);
    out = tf.layers.reLU().apply(out);
    out = this.conv2.apply(out);
    out = this.bn2.apply(out);
    out = tf.layers.add().apply([out, residual]);
    return tf.layers.reLU().apply(out);
  }
}

/**
 * Full ResNet Architecture
 * Equivalent to your Python ResNet(nn.Module)
 */
export class BhariyoResNet {
  constructor(numResBlocks = 4, numHidden = 64) {
    this.numResBlocks = numResBlocks;
    this.numHidden = numHidden;
    this.model = null;
    this.initModel();
  }

  initModel() {
    const input = tf.input({ shape: [24, 3] }); // 24 nodes, 3 states (empty, p1, p2)

    // Start Block
    let x = tf.layers.conv1d({ filters: this.numHidden, kernelSize: 3, padding: 'same' }).apply(input);
    x = tf.layers.batchNormalization().apply(x);
    x = tf.layers.reLU().apply(x);

    // Backbone (Residual Blocks)
    for (let i = 0; i < this.numResBlocks; i++) {
      const resBlock = new ResBlock(this.numHidden);
      x = resBlock.apply(x);
    }

    // Policy Head
    let policy = tf.layers.conv1d({ filters: 32, kernelSize: 3, padding: 'same' }).apply(x);
    policy = tf.layers.batchNormalization().apply(policy);
    policy = tf.layers.reLU().apply(policy);
    policy = tf.layers.flatten().apply(policy);
    const policyOutput = tf.layers.dense({ units: 624, activation: 'softmax', name: 'policy' }).apply(policy);

    // Value Head
    let value = tf.layers.conv1d({ filters: 3, kernelSize: 3, padding: 'same' }).apply(x);
    value = tf.layers.batchNormalization().apply(value);
    value = tf.layers.reLU().apply(value);
    value = tf.layers.flatten().apply(value);
    value = tf.layers.dense({ units: 1, activation: 'tanh', name: 'value' }).apply(value);

    this.model = tf.model({ inputs: input, outputs: [policyOutput, value] });
  }

  /**
   * Forward pass: predict policy and value for a given state
   */
  async predict(encodedState) {
    return tf.tidy(() => {
      const inputTensor = tf.tensor3d([encodedState]);
      const [policy, value] = this.model.predict(inputTensor);
      
      // We use dataSync here because inside tidy we want to grab the values 
      // before the tensors are disposed at the end of the block.
      const pData = policy.dataSync();
      const vData = value.dataSync();
      
      return { policy: pData, value: vData[0] };
    });
  }
}
