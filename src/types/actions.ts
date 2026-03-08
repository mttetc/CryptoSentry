export interface ActionState {
  success: boolean;
  error?: string;
}

export const initialActionState: ActionState = {
  error: undefined,
  success: false,
};
