# The tide

Which day of the week does the work happen? A plain mean of weekday
numbers cannot say: Saturday and Sunday average to Wednesday. The week is
a circle, and the question needs circular statistics. The answer is a
direction (the mean weekday), a length (how tightly the week's commits
cluster), and a concentration $\kappa$ in the units of the distribution
that models such things — and a density the page can draw as water
standing highest on the day the commits come.

## The mean direction

Put day $k$ of $K$ at angle $\theta_k = 2\pi k / K$ and give it weight
$w_k$, its commits. The first trigonometric moment is

$$\bar C = \frac{\sum_k w_k \cos\theta_k}{\sum_k w_k}, \qquad
  \bar S = \frac{\sum_k w_k \sin\theta_k}{\sum_k w_k},$$

and the **mean resultant** is the vector $(\bar C, \bar S)$: its direction
$\mu = \operatorname{atan2}(\bar S, \bar C)$ is the mean weekday and its
length $\bar R = \sqrt{\bar C^2 + \bar S^2} \in [0, 1]$ says how much the
week agrees with itself. Equal weight on every day gives $\bar R = 0$ and
no preferred direction; everything on one day gives $\bar R = 1$. Weight
split between Saturday and Sunday gives $\mu$ half a day before Sunday
and $\bar R = \cos(\pi/7)$ — the wrap handled, and the spread shortening
the resultant exactly as it should.

## The von Mises distribution

The circle's Gaussian is the von Mises density

$$f(\theta \mid \mu, \kappa) = \frac{e^{\kappa \cos(\theta - \mu)}}{2\pi I_0(\kappa)},$$

with $I_0$ the modified Bessel function of order zero, there to make it
integrate to one. $\kappa = 0$ is uniform; as $\kappa$ grows the density
narrows around $\mu$, and for large $\kappa$ it is a Gaussian of variance
$1/\kappa$ wrapped on the circle. Its maximum-likelihood mean direction is
exactly $\mu$ above, and its resultant length is a known function of the
concentration,

$$A(\kappa) = \frac{I_1(\kappa)}{I_0(\kappa)} = \bar R,$$

so fitting $\kappa$ means inverting $A$. There is no closed form; Best and
Fisher's three-branch approximation is accurate to a few parts in a
thousand across the range:

$$\hat\kappa =
\begin{cases}
2\bar R + \bar R^3 + \tfrac{5}{6}\bar R^5 & \bar R < 0.53,\\
-0.4 + 1.39\bar R + \dfrac{0.43}{1 - \bar R} & 0.53 \le \bar R < 0.85,\\
\dfrac{1}{\bar R^3 - 4\bar R^2 + 3\bar R} & \bar R \ge 0.85 .
\end{cases}$$

At $\bar R = 1$ the last branch is infinite: a spike is a spike, and the
fit reports `KAPPA_MAX` rather than a number with no meaning.

## Evaluating the density safely

$e^{\kappa}$ overflows a double at $\kappa \approx 709$, and $I_0(\kappa)$
grows like $e^\kappa / \sqrt{2\pi\kappa}$ — so the density is written as

$$f(\theta) = \frac{e^{\kappa(\cos(\theta - \mu) - 1)}}{2\pi\, e^{-\kappa} I_0(\kappa)},$$

whose numerator is at most one and whose denominator is the
exponentially scaled Bessel function $e^{-\kappa} I_0(\kappa)$, computed
without ever forming $e^\kappa$: the power series
$\sum_k (\kappa/2)^{2k} / (k!)^2$ times $e^{-\kappa}$ while $\kappa \le 30$
(its terms stay within a dozen orders of magnitude), and the asymptotic
expansion

$$e^{-\kappa} I_0(\kappa) \approx \frac{1}{\sqrt{2\pi\kappa}}
  \left(1 + \frac{1}{8\kappa} + \frac{9}{128\kappa^2} + \frac{225}{3072\kappa^3}\right)$$

beyond. The two agree to $2 \times 10^{-6}$ at the seam, and the density
integrates to one at $\kappa = 400$ as surely as at $\kappa = 0$.

## The honest limit of seven bins

A week has seven days, so the density is sampled at seven points, and
sampling aliases: the sixth and eighth harmonics of $f$ fold onto the
first, biasing $\bar R$. Those harmonics are $I_6(\kappa)/I_0(\kappa)$
and $I_8(\kappa)/I_0(\kappa)$, negligible for the concentrations a working
week produces — at $\kappa = 2$ the fitted $\kappa$ is within a tenth of
the truth, at $\kappa \le 1$ within a few hundredths — and the mean
direction is barely touched. A week that commits only on Tuesdays is
reported as a spike (`KAPPA_MAX`) rather than as a precise concentration
seven samples cannot support, which is the right thing to say about it.

## Constants

| constant | value | role |
| --- | --- | --- |
| `KAPPA_MAX` | $10^3$ | what a resultant of length 1 reports instead of infinity |
| Best–Fisher branches | $0.53, 0.85$ | where the three approximations to $A^{-1}$ hand over |
| series bound | $\kappa \le 30$ | below it the power series for $e^{-\kappa}I_0$, above it the asymptotic |
| series terms | $\le 200$, stop at $10^{-17}$ relative | the power series' convergence |

## Aesthetic terms

None in the fit: the mean direction, the resultant and the von Mises
family are the standard circular statistics, and Best–Fisher is the
standard inversion. What the page draws from them — a tide line whose
height on any day is $f(\text{that day}) / f(\mu)$, so the water stands
highest on the mean weekday — is a picture chosen for the shore it sits
on, and its colour and height are the consumer's.
