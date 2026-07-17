import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  DownloadCloud,
  Play,
} from "lucide-react";

interface ImportActionsProps {

  competitionId: number | null;

  season: string;

  selectedImports: string[];

  onImportSelected: () => void;

  onImportEverything: () => void;

  loading: boolean;

}

export function ImportActions({

  competitionId,

  season,

  selectedImports,

  onImportSelected,

  onImportEverything,

  loading,

}: ImportActionsProps) {

  return (

    <Card>

      <CardHeader>

        <CardTitle>

          Import Actions

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-3">

        <div className="text-sm text-muted-foreground">

          Selected Competition ID:

          <strong> {competitionId ?? "None"}</strong>

        </div>

        <div className="text-sm text-muted-foreground">

          Selected Imports:

          <strong> {selectedImports.length}</strong>

        </div>

        <Button
          className="w-full"
          disabled={
            !competitionId ||
             !season ||
            selectedImports.length === 0 ||
            loading
          }
          onClick={onImportSelected}
        >

          <DownloadCloud className="mr-2 h-4 w-4" />

          {loading
            ? "Importing..."
            : "Import Selected"}

        </Button>

        <Button
          variant="secondary"
          className="w-full"
          disabled={
            !competitionId ||
            !season ||
            loading
          }
          onClick={onImportEverything}
        >

          <Play className="mr-2 h-4 w-4" />

          Import Everything Available

        </Button>

      </CardContent>

    </Card>

  );

}
