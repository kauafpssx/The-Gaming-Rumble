export function RoutePath({ path }: { path: string }) {
  return (
    <>
      {path.split("/").map((seg, i) => {
        if (seg.startsWith(":")) {
          return (
            <span key={i} className="text-amber-400">
              /{seg}
            </span>
          );
        }
        return <span key={i}>{i === 0 ? "" : "/"}{seg}</span>;
      })}
    </>
  );
}
