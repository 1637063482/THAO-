export type DomHost = HTMLElement;

export interface NavigationRoot {
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
}

export interface SavingsGoalForm extends HTMLFormElement {
  monthly: HTMLInputElement;
  annual: HTMLInputElement;
}
