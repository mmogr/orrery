/* An observable is a derived quantity that has earned a place on the sky:
   it has a name, a unit, and one sentence the legend can say about it. The
   rule of the house: if the sentence cannot be written, the quantity does
   not ship. */
export interface Observable<T = number> {
  /* stable id, kebab-case; the legend row carries it as data-obs */
  id: string;
  /* the name a person reads */
  name: string;
  /* the unit, human-readable ("weeks", "bits", "contributions/week") */
  unit: string;
  value: T;
  /* the legend's sentence for tonight's value */
  sentence: string;
}
