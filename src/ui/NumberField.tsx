import { useState } from 'react';

import { parseDecimal } from '@/domain/units';

import { TextField } from './TextField';

interface Props {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  suffix?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
}

/**
 * A text box for numbers. Keeps what the user typed (so "175." isn't
 * reformatted mid-typing) and reports the parsed number, or undefined.
 */
export function NumberField({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  return (
    <TextField
      {...rest}
      numeric
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(parseDecimal(next));
      }}
    />
  );
}
