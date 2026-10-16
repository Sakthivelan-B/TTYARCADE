import { notFound } from "next/navigation";
import { packGame } from "@/lib/pack/catalog";
import { PackGame } from "@/components/pack-game";
export default async function ExpansionPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  if (!packGame(game)) notFound();
  return <PackGame id={game} />;
}
