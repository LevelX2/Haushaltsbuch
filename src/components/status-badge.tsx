import clsx from "clsx";

type Props = {
  children: string;
  tone?: "default" | "warn" | "danger" | "muted";
};

export function StatusBadge({ children, tone = "default" }: Props) {
  return <span className={clsx("badge", tone !== "default" && tone)}>{children}</span>;
}
