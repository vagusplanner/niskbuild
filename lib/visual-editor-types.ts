export type StyleChanges = {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  display?: string;
  mobileFontSize?: number;
  mobilePaddingTop?: number;
  mobilePaddingRight?: number;
  mobilePaddingBottom?: number;
  mobilePaddingLeft?: number;
  mobileDisplay?: string;
};

export type SelectedVisualElement = {
  selector: string;
  tagName: string;
  breadcrumb: string[];
  styles: StyleChanges;
};

export const VISUAL_EDIT_CREDIT_COST = 0.3;
