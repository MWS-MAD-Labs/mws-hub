export default function LoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <span className="loading loading-spinner loading-lg" />
        {/* Gimana biar loadingnya tuh napilin container gitu ?? */}
        
      </div>
    </div>
  );
}