*Portfolio Assignment: Deep Learning Blog Post*
<h3><strong>Is Less Really More?: The Balancing Act of Weight Decay</strong></h3>

Neural networks are very good at learning from data. Sometimes, a little too good.

Given enough capacity, a network can fit its training data almost perfectly, learning not only the underlying patterns but also the quirks and noise within individual examples. The problem becomes apparent when it encounters data it has never seen before. Despite performing exceptionally well during training, it may struggle to generalize beyond what it has already learned.

One way to address this is through **regularization**, a collection of techniques that discourage models from becoming too dependent on their training data. Among these techniques is **weight decay**, which encourages a neural network to keep its weights small throughout training.

The intuition seems straightforward: discourage excessively large weights, and perhaps the model will learn more general patterns instead of memorizing its examples.

***But how much decay is enough? Does increasing it always improve generalization? And what happens when we apply the same regularization to entirely different network architectures?***

To explore these questions, I conducted a series of experiments using three neural network architectures, six weight decay strengths, and three random seeds, resulting in 54 training runs. Some results followed expectations. Others revealed a more complicated relationship between regularization and learning.

<h4><strong>What Weight Decay Changes</strong></h4>

A neural network learns through adjustable numerical parameters called weights. During training, these weights are updated to minimize a loss function, which measures how well the model's predictions match the correct answers.

However, minimizing training loss does not guarantee good performance on unfamiliar data. Overfitting occurs when a model learns its training examples too closely, including patterns that do not generalize.

Weight decay addresses this by penalizing large weights. Its close relative, L2 regularization, adds a penalty to the original loss function:

$$\theta \leftarrow \theta - \eta \nabla_\theta L$$

Here, $\theta$ represents the model's weights, while $\lambda$ controls the strength of the penalty.

For gradient descent, the resulting update becomes:

$$\theta \leftarrow
(1-\eta\lambda)\theta
-\eta\nabla_\theta L_{\text{data}}$$

In addition to minimizing the original loss, each update slightly shrinks the weights toward zero. A larger $\lambda$ applies stronger shrinkage.

For plain SGD, L2 regularization and weight decay produce the same update. However, this equivalence does not generally hold for adaptive optimizers such as Adam, which is why AdamW applies weight decay separately from the adaptive gradient update.

There is another consideration: the decay coefficient alone does not tell us how much shrinkage happens throughout training.

<h4><strong>Measuring the Strength of Decay</strong></h4>

The cumulative effect of weight decay depends on the learning rate, number of optimization steps, and momentum.

For the SGD implementation used in this experiment, I used the following approximation:

$$
B=\frac{\eta\lambda T}{1-\beta}
$$

I call $B$ the decay budget. It estimates the cumulative strength of weight decay, where $\eta$ is the learning rate, $\lambda$ is the decay coefficient, $T$ is the number of optimization steps, and $\beta$ is the momentum.

In a simplified setting where the data gradient is zero, decay alone would shrink the weights approximately by a factor of $e^{-B}$.

For this experiment, the learning rate was 0.01, momentum was 0.9, and training involved 1,550 optimization steps. Therefore:

$$
B=155\lambda
$$

I calculated the decay budget for each configuration using:

```
def budget(wd, epochs, lr=0.01):
    """Estimate cumulative shrinkage from weight decay."""
    return lr * wd * STEPS * epochs / (1 - BETA)
```

This distinction matters because two experiments using the same decay coefficient can experience different levels of regularization depending on their training configurations.

<h4><strong>Putting It to the Test: Flowers-102</strong></h4>

For the main experiment, I used the Oxford Flowers-102 dataset, containing images from 102 flower categories.

![One Flowers-102 training image from each of the first ten classes](attachment:samples.png)

*Figure 1. Sample training images from the Flowers-102 dataset.*

To make generalization an important consideration, I limited the training set to just 10 images per class, giving 1,020 training images. The validation and test sets contained 1,020 and 6,149 images, respectively. All images were resized to 64 × 64 pixels.

I trained three architectures:

- MLP: A fully connected neural network with approximately 6.4 million parameters.

- CNN: A smaller convolutional network with approximately 2.1 million parameters.

- ResNet-18: A deeper residual network with approximately 11.2 million parameters, trained from scratch.

An important difference is that ResNet-18 uses Batch Normalization, which becomes relevant when examining how its weights behave.

All models used SGD with momentum 0.9, a learning rate of 0.01, a batch size of 32, and 50 epochs. I excluded dropout and data augmentation to isolate the effects of weight decay.

I tested six decay strengths, from 0 to 0.01, with three random seeds per configuration. Within each seed, all configurations started from identical initial weights, allowing more controlled comparisons.

The main sweep was configured as follows:

```
df = sweep(
    "weight_decay",
    [0.0, 1e-4, 3e-4, 1e-3, 3e-3, 1e-2],
    epochs=50,
    batch_size=32
)
```

My initial expectation was that moderate decay would improve the MLP and CNN, while stronger decay would eventually cause underfitting.

The results were more complicated.

<h4><strong>When Accuracy Doesn't Tell the Whole Story</strong></h4>

![accuracy-vs-weight-decay.png](attachment:accuracy-vs-weight-decay.png)

*Figure 2. Final validation accuracy across decay strengths, averaged over three seeds. Shaded regions show the range between the lowest and highest seed results.*

At first glance, the changes in accuracy were surprisingly small.

For decay values up to 0.003, all three models generally stayed within approximately one percentage point of their no-decay configurations. The CNN showed a small improvement, while the MLP and ResNet-18 experienced relatively minor changes.

Training accuracy also remained close to 100% across configurations. My expectation that stronger decay would cause underfitting was therefore not supported by the main sweep.

However, accuracy only tells us whether the model's highest-scoring prediction is correct. It does not tell us how confident the model is in that prediction.

For that, we need to examine the loss.

<h4><strong>A Different Story in Validation Loss</strong></h4>

![val-loss-curves.png](attachment:val-loss-curves.png)

*Figure 3. Validation loss throughout training. Darker lines represent stronger weight decay.*

Unlike accuracy, validation loss showed a substantial response to regularization.

For context, a model assigning equal probability to all 102 flower categories would have a cross-entropy loss of:

$$
\ln(102)\approx4.62
$$

Without weight decay, the MLP finished with a validation loss of 5.76, while the CNN reached 8.15. Both were worse than the uniform-prediction baseline.

At a decay value of 0.01, their validation losses dropped to 4.21 and 4.82, representing reductions of approximately 27% and 41%, respectively.

The models did not become substantially more accurate, but their predictions became less severely penalized by the loss function. This is consistent with reduced overconfidence: weight decay may have moderated their output scores, or logits, without substantially changing which class ranked first.

Interestingly, validation loss reached its minimum relatively early, around epoch 3 for the MLP and epoch 5 for the CNN, while accuracy continued improving for several more epochs.

This suggests that early stopping based on validation loss would not necessarily reproduce the same behavior as weight decay.

<h4><strong>Following the Weights</strong></h4>

![weight-norm-curves.png](attachment:weight-norm-curves.png)

*Figure 4. Total L2 weight norm throughout training.*

To understand what was happening during training, I also tracked the models' total L2 weight norms, which measure the combined magnitude of their parameters.

The MLP and CNN initially showed increasing weight norms as they learned from the training data. After approximately 10–15 epochs, however, their norms began to decrease as weight decay counteracted that growth.

This reflects the competing effects of optimization: the data gradient encourages updates that improve predictions, while weight decay continuously pulls the parameters toward zero.

The training loss also reflected this trade-off. For the MLP, it increased from 0.0009 without decay to 0.079 at a decay value of 0.01.

ResNet-18 behaved differently. Its weight norm decreased almost immediately, closely following the trajectory predicted by decay alone. At a decay value of 0.003, its measured final norm was 71.3, compared with a predicted 70.3.

This raised another question **why did ResNet-18 respond so differently?**

<h4><strong>When Stronger Decay Becomes a Problem</strong></h4>

One of the most unexpected observations occurred at a weight decay value of 0.01.

All three ResNet-18 seeds temporarily lost their ability to fit the training set around epochs 43–44. Training accuracy dropped to 12.0%, 7.4%, and 4.6%, respectively, before recovering to 100%.

A possible explanation involves scale invariance, a property associated with convolutional layers followed by Batch Normalization.

In simplified terms, scaling the weights of these layers does not necessarily change their normalized output. However, shrinking their weights can still affect optimization because their effective learning rate increases approximately in proportion to:

$$
\eta_{\text{effective}}\propto
\frac{\eta}{|w|^2}
$$

As the weight norm decreases, updates become larger relative to the current weight scale.

In this experiment, the convolutional weights were reduced to approximately 27% of their starting norm. Based on the inverse-square relationship, this corresponds to updates roughly 13 times larger in relative scale.

This provides a plausible explanation for the temporary instability, although the available results do not establish it as the definitive cause.

The CNN also experienced occasional drops in training accuracy, reaching approximately 80–90%, but the logs do not explain why.

These observations highlight an important point: weight decay does not affect every architecture in the same way. Its interaction with the model's structure can influence not only generalization but also the stability of training.

<h4><strong>When Stronger Decay Becomes a Problem</strong></h4>

The decay budget helps explain why some configurations produced noticeable changes while others barely affected training.

The largest budget in the main sweep was:

$$ B=155(0.01)=1.55 $$

Meanwhile, a decay value of 0.0001 produced a budget of just 0.0155.

The results suggest three broad behaviors in this particular setup:

- Very weak decay (λ ≤ 0.0001): Limited effect, with the MLP and CNN remaining highly overconfident on the validation set.

- Moderate decay (λ = 0.001–0.003): Substantially lower validation loss for the MLP and CNN, with relatively stable accuracy.

- Stronger decay (λ = 0.01): Continued validation-loss improvements for the MLP and CNN, but temporary instability and lower test accuracy for ResNet-18.

These are observations specific to the dataset, architectures, and training configuration, not universal thresholds for weight decay.

There are still questions worth investigating. Additional experiments in the notebook explore stronger decay values, selectively applying decay to ResNet-18's convolutional weights, and comparing Adam with AdamW. Their results have not yet been saved.

The current experiment also has limitations. Three random seeds and a relatively small validation set make differences of around one percentage point difficult to interpret confidently.

<h4><strong>So Is Less Really More?</strong></h4>

The experiments suggest that weight decay can improve generalization without necessarily producing large changes in classification accuracy.

For the MLP and CNN, validation loss decreased considerably even as training accuracy remained close to perfect. Their weight norms also revealed how learning and regularization compete throughout optimization.

ResNet-18, however, demonstrated why stronger decay is not always straightforward. Its Batch Normalization layers introduced scale-invariant behavior that made shrinking convolutional weights particularly consequential for training stability.

Ultimately, weight decay is not simply about making neural network weights smaller. It is about controlling how those weights evolve during training and finding a balance between fitting available data and performing well on unseen examples.

A smaller weight norm does not automatically mean a better model. Sometimes, a little regularization goes a long way. Other times, pushing it further changes the way a model learns in ways we might not expect.

**Perhaps the more important question isn't how small we can make the weights, but how much regularization a model actually needs to learn well.**

<h6>
<strong> AI Tools Disclosure </strong> 
<br>
AI tools were used at different stages of this work. Claude assisted with debugging and troubleshooting the notebook's code, while ChatGPT helped refine the written work's grammar, sentence structure, and readability.
</h6>