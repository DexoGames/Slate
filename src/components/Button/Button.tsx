import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary";

interface CommonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

interface LinkProps extends CommonProps {
  href: string;
  /** Open in a new tab with safe rel. Defaults to true. */
  external?: boolean;
}

interface ActionProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  href?: undefined;
}

type ButtonProps = LinkProps | ActionProps;

/**
 * Brutalist button shared with the dexo.games look. Renders an <a> when given an
 * `href`, otherwise a real <button> (so it can drive clicks/forms in the game).
 */
export function Button(props: ButtonProps) {
  const { variant = "primary", className, children } = props;
  const cls = cx(styles.btn, styles[variant], className);

  if ("href" in props && props.href !== undefined) {
    const { external = true } = props;
    const externalProps = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};
    return (
      <a href={props.href} className={cls} {...externalProps}>
        {children}
      </a>
    );
  }

  const { variant: _v, className: _c, children: _ch, href: _h, ...rest } =
    props as ActionProps & { href?: undefined };
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
