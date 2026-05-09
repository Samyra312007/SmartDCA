export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon:         string;
  title:        string;
  description:  string;
  action?:      React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="text-6xl">{icon}</div>
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400 max-w-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}