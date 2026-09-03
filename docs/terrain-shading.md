# Terrain shading: Lambert, with the lamp named

*`src/terrain/shade.ts`*

The mountain range is lit by one fixed lamp and nothing else. Every face of
the relief takes the same two-term shade:

$$
f = A + D \,\max(0,\ \hat{n}\cdot\hat{L}), \qquad A = 0.6,\quad D = 0.4
$$

where $\hat{n}$ is the face's unit normal (flipped so $n_z \ge 0$ — the
camera never sees the underside of the ground) and $\hat{L}$ the unit
direction toward the light. $f$ multiplies the rock's own colour channel by
channel, so shading darkens; it never tints.

## The named lamp

The page has always used

$$
L = (-0.42,\ 0.3,\ 0.86)
$$

— a lamp high in the north-west, in the terrain's own frame: $x$ east along
the weeks, $y$ south along the days, $z$ up. It was chosen by eye and never
normalised; its length is

$$
\lVert L \rVert = \sqrt{0.42^2 + 0.3^2 + 0.86^2} = \sqrt{1.006} \approx 1.00295 .
$$

This library exports `LIGHT` $= L / \lVert L \rVert$ and states it as unit.

## The 0.6 / 0.4 split

The ambient floor $A = 0.6$ is what the sky pays every face regardless of
orientation; the diffuse budget $D = 0.4$ is what facing the lamp can earn
on top. So $f \in [0.6, 1.0]$: a face square to the light keeps its full
colour, a face edge-on or turned away drops to 60%. The range is deliberate
— slopes read as relief without any face going to black, which would punch
holes in a mountainside.

## The $\lVert L \rVert = 1.003$ quirk, and what fixing it costs

The old page normalised $\hat n$ but dotted it with the *raw* $L$, so its
diffuse term was really

$$
D\,\max(0,\ \hat n \cdot L) = D\,\lVert L\rVert\,\max(0,\ \hat n \cdot \hat L)
$$

— the diffuse budget ran $0.295\%$ hot, an effective $D' \approx 0.4012$.
Normalising the lamp shifts every shade value by at most

$$
\left|\Delta f\right| \le D\,(\lVert L\rVert - 1) \approx 0.0012,
$$

i.e. a relative shift in the diffuse term of $\le 0.3\%$ — roughly one
count in an 8-bit channel at the brightest slopes, invisible in practice.
**Accepted deviation for M5b:** the library's `lambert` uses the unit lamp;
the page's shading moves by $\le 0.3\%$ of the diffuse term when it adopts
it, and that is the intended, documented change rather than a regression.
