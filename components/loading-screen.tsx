export function LoadingScreen({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="center-screen">
      <div className="loading-card">
        <div className="spinner" />
        <p>{label}</p>
      </div>
    </div>
  );
}
