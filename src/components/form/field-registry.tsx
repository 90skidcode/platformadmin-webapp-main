import { CheckboxField } from "./fields/checkbox-field";
import type { FieldComponentProps } from "./fields/field-types";
import { HiddenField } from "./fields/hidden-field";
import { MultiSelectField } from "./fields/multi-select-field";
import { SelectField } from "./fields/select-field";
import { SwitchField } from "./fields/switch-field";
import { TextField } from "./fields/text-field";
import { TextareaField } from "./fields/textarea-field";
import type { FormFieldType } from "./types";

/** Registry-pattern dispatch, not a growing if/switch chain (plan §18's
 * SonarQube S3776 note) -- a new field type is a new small component
 * registered here, never a branch added to an existing one. */
export const FIELD_REGISTRY: Record<
  FormFieldType,
  React.ComponentType<FieldComponentProps>
> = {
  text: TextField,
  email: TextField,
  password: TextField,
  number: TextField,
  date: TextField,
  textarea: TextareaField,
  select: SelectField,
  "multi-select": MultiSelectField,
  checkbox: CheckboxField,
  switch: SwitchField,
  hidden: HiddenField,
};
