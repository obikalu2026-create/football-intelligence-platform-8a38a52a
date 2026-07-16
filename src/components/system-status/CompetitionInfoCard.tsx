import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

interface CompetitionInfoCardProps {
  competition: {
    id: number;
    name: string;
    type: string;

    country: string;
    countryCode: string | null;

    logo: string;
    flag: string | null;

    season?: number;
  } | null;
}

export function CompetitionInfoCard({
  competition,
}: CompetitionInfoCardProps) {

  if (!competition) {

    return (
      <Card>

        <CardHeader>

          <CardTitle>

            Competition Information

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="text-sm text-muted-foreground">

            Select a competition to view details.

          </div>

        </CardContent>

      </Card>
    );
  }
    return (

    <Card>

      <CardHeader>

        <CardTitle>

          Competition Information

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-6">

        <div className="flex items-center gap-4">

          <img
            src={competition.logo}
            alt={competition.name}
            className="h-16 w-16 rounded"
          />

          <div>

            <div className="text-xl font-bold">

              {competition.name}

            </div>

            <div className="text-sm text-muted-foreground">

              {competition.country}

            </div>

          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2">
                    <div>

            <div className="text-xs text-muted-foreground">
              League ID
            </div>

            <div className="font-semibold">
              {competition.id}
            </div>

          </div>

          <div>

            <div className="text-xs text-muted-foreground">
              Competition Type
            </div>

            <Badge variant="secondary">
              {competition.type}
            </Badge>

          </div>

          <div>

            <div className="text-xs text-muted-foreground">
              Country Code
            </div>

            <div className="font-semibold">
              {competition.countryCode ?? "N/A"}
            </div>

          </div>

          <div>

            <div className="text-xs text-muted-foreground">
              Current Season
            </div>

            <div className="font-semibold">
              {competition.season ?? "Unknown"}
            </div>

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          <Badge>
            Ready to Import
          </Badge>

          <Badge variant="outline">
            API-Football
          </Badge>

        </div>

      </CardContent>

    </Card>

  );

}
