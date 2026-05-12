import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="content-wrap">
      <Skeleton rows={8} cols={5} />
    </div>
  );
}
