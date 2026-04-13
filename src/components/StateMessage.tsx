type StateMessageProps = {
  title: string;
  description: string;
};

export function StateMessage({ title, description }: StateMessageProps) {
  return (
    <div className="state-message">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
