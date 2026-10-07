module.exports = {
  systems: [
    {
      name: "Non-ergodic",
      behaviour: "Points never change height.",
      lead: "The space splits into parts that trajectories never cross between.",
      intuition:
        "There is a measurable region A with 0 < μ(A) < 1 that is invariant: points inside stay inside, and points outside stay outside, apart from exceptions of measure zero.",
      tex: "T^{-1}(A)=A,\\qquad 0<\\mu(A)<1",
      example:
        "Horizontal shear: x increases by 0.071 + 0.11y at each step; y stays fixed.",
      scope: "The equality is understood up to a set of measure zero.",
    },
    {
      name: "Ergodic",
      behaviour: "The whole pattern translates intact.",
      lead: "Almost every trajectory visits each fixed region in proportion to its measure.",
      intuition:
        "For every measurable region A, and for almost every starting point x, the fraction of recorded positions lying in A converges to μ(A).",
      tex: "\\lim_{N\\to\\infty}\\frac{\\#\\{0\\le n<N:T^n x\\in A\\}}{N}=\\mu(A)",
      scope:
        "Here, # counts how many of the first N recorded positions lie in A.",
      example:
        "Add (√2 − 1, √3 − 1) modulo 1. This irrational translation is ergodic, but its rigid pattern keeps returning: it is not weakly mixing.",
    },
    {
      name: "Weak mixing",
      behaviour: "The pattern disperses, then partly returns.",
      lead: "For any two fixed regions, the average departure from independence tends to zero, although substantial dependence may still recur at arbitrarily long time gaps.",
      intuition:
        "For measurable regions A and B, the measure of points that start in A and reach B after n steps is μ(A ∩ T⁻ⁿ(B)). Independence would give μ(A)μ(B). Weak mixing requires the average absolute difference between these quantities to tend to zero.",
      tex: "\\lim_{N\\to\\infty}\\frac1N\\sum_{n=0}^{N-1}\\bigl|\\mu(A\\cap T^{-n}(B))-\\mu(A)\\mu(B)\\bigr|=0",
      scope: "T⁻ⁿ(B) is the set of starting points that reach B after n steps.",
      example:
        "Chacon repeats one rule: cut into three, add one level above the middle part, then stack. Repetition creates the fine structure. Applied independently to x and y, it is weakly mixing but not strongly mixing.",
    },
    {
      name: "Strong mixing",
      behaviour: "Staircase cutting and stacking disperses the colours.",
      lead: "For any two fixed regions, dependence becomes arbitrarily small and remains that small at every sufficiently long time gap.",
      intuition:
        "For measurable regions A and B, the measure of points that start in A and reach B after n steps approaches the independent value μ(A)μ(B). Once the difference falls below any chosen positive bound, it stays below that bound at every sufficiently late step.",
      tex: "\\lim_{n\\to\\infty}\\bigl|\\mu(A\\cap T^{-n}(B))-\\mu(A)\\mu(B)\\bigr|=0",
      scope: "T⁻ⁿ(B) is the set of starting points that reach B after n steps.",
      example:
        "The staircase construction uses 2, then 3, then 4, … cuts, adding 0, 1, 2, … levels above successive pieces. Applied to both coordinates, it is strongly mixing. Its entropy is zero, so it is not K.",
    },
    {
      name: "K-system",
      behaviour: "A walk revisits a fixed sequence of binary labels.",
      lead: "However you divide the space into finitely many regions of positive measure, with at least two regions, the complete record of previous visits cannot always determine which region comes next.",
      intuition:
        "Choose any such division into disjoint measurable regions covering the space. Record the region occupied at each step. Even given the entire past record, the next region has positive conditional entropy: its label is not determined with certainty for all histories except a set of measure zero.",
      tex: "H(S_0\\mid S_{-1},S_{-2},\\ldots)>0",
      scope:
        "S₀ is the current region label; S₋₁, S₋₂, … are the previous labels. The conditional entropy measures the information still needed to specify the current label after the previous labels are known, averaged over histories. K stands for Kolmogorov.",
      example:
        "Kalikow’s walk moves left or right through a fixed sequence of binary labels. Revisiting a site reveals the same label. Here x encodes the steps and y the labels viewed from the walker. This system is K but not Bernoulli.",
    },
    {
      name: "Bernoulli",
      behaviour: "Each step moves one binary digit from x to y.",
      lead: "The system has a complete description in which successive observations are independent repetitions of the same random experiment.",
      intuition:
        "There is a finite or countable division of the state space into disjoint measurable regions such that recording the region occupied at each step produces independent outcomes. Knowing any previous outcomes leaves the probabilities of the next outcome unchanged. This division must also give a complete description: the record of regions visited at all past and future steps determines the starting point, apart from exceptions of measure zero.",
      tex: "P(S_1=a_1,\\ldots,S_k=a_k)=\\prod_{j=1}^{k}p_{a_j}",
      scope:
        "Sₙ is the region occupied at step n, and pₐ is the measure of region a. For every length k and every choice of region labels, the probability of the whole sequence equals the product of the individual probabilities.",
      example:
        "The baker map stretches the square horizontally, cuts it in half, then stacks the halves. Binary digits pass from x to y. Under uniform area measure, these digits are independent fair bits.",
      after:
        "Bernoulli systems therefore admit a description whose observations form an independent, identically distributed Markov process.",
    },
  ],
  metrics: [
    {
      id: "correlation",
      title: "Cell-return correlation",
      plotTitle: "Cell return",
      symbol: "R(n)",
      lead: "This measures how much more or less often particles return to their starting cell than independent sampling would predict.",
      description:
        "q is the total number of cells in the selected grid. P(Cₙ = C₀) is the fraction of particles in their starting cell after n steps. R = 1 means all particles return. R = 0 means the return fraction matches independent sampling, which is 1/q. Negative values mean fewer returns.",
      tex: "R(n)=\\frac{q\\,P(C_n=C_0)-1}{q-1}",
    },
    {
      id: "memory",
      title: "Coarse memory",
      symbol: "M(n)",
      lead: "This measures how much a particle’s current cell reveals about its starting cell.",
      description:
        "H(C₀) measures the diversity of starting cells across all particles. H(C₀ | Cₙ) measures that diversity among particles sharing a current cell, averaged across current cells in proportion to their particle counts.",
      paragraphs: [
        "Here, diversity is measured by Shannon entropy: it is zero when all particles share one starting cell, and largest when they are evenly distributed among all starting cells.",
        "M = 1: each current cell contains particles from just one starting cell. M = 0: each current cell contains the same proportions from each starting cell as the whole sample.",
      ],
      tex: "M(n)=1-\\frac{H(C_0\\mid C_n)}{H(C_0)}",
    },
    {
      id: "error",
      title: "Time-average error",
      symbol: "D(n)",
      lead: "This measures how far each particle’s time spent in each cell departs from an equal share, averaged over all particles.",
      description:
        "q is the total number of grid cells. v<sub>c</sub>(n) is the fraction of a particle’s recorded positions that lie in cell c, counting steps 0 through n. The equal share is 1/q.",
      paragraphs: [
        "The formula adds the absolute differences from that equal share and divides by two. ⟨…⟩ averages the result over particles.",
        "D = 0 means every particle has spent an equal fraction of time in every cell. Larger values mean more uneven visits.",
      ],
      tex: "D(n)=\\left\\langle\\frac12\\sum\\nolimits_{c=1}^{q}\\left|v_c(n)-\\frac1q\\right|\\right\\rangle",
    },
  ],
};
