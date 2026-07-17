import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AvailableImports } from "./AvailableImports";
import { ImportActions } from "./ImportActions";
import { runImportPipeline } from "@/lib/importPipeline.functions";
import {
  ImportProgress,
  type ProgressStep,
} from "./ImportProgress";

import {
  createImportJob,
  getImportProgress,
} from "@/lib/importProgress.functions";

import { getCompetitions } from "@/lib/competitions.functions";
import { CompetitionInfoCard } from "./CompetitionInfoCard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Competition {
  id: number;
  name: string;
  type: string;

  country: string;
  countryCode: string | null;

  logo: string;
  flag: string |null;
}

export function DataImportCenter() {

  const getCompetitionsFn =
  useServerFn(getCompetitions);

  const runPipelineFn =
  useServerFn(runImportPipeline);

  const createImportJobFn =
  useServerFn(createImportJob);

const getImportProgressFn =
  useServerFn(getImportProgress);

  const [loading, setLoading] =
    useState(true);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [selectedCountry, setSelectedCountry] =
    useState("");

  const [selectedLeague, setSelectedLeague] =
    useState("");

  const [selectedSeason, setSelectedSeason] =
  useState("");

  const [selectedImports, setSelectedImports] =
  useState<string[]>([
    "Competition",
    "Seasons",
    "Teams",
    "Fixtures",
    "Standings",
  ]);
  const [importing, setImporting] =
  useState(false);
  const [progress, setProgress] =
  useState<ProgressStep[]>([]);
  const [activeJobId, setActiveJobId] =
  useState<string | null>(null);

  useEffect(() => {

    async function load() {

      try {

        const data =
          await getCompetitionsFn();

        setCompetitions(data);

      } finally {

        setLoading(false);

      }

    }

    load();

  }, []);
  useEffect(() => {

  if (!activeJobId) {
    return;
  }

  const interval = setInterval(async () => {

    try {

      const job =
        await getImportProgressFn({
          data: {
            jobId: activeJobId,
          },
        });

      if (Array.isArray(job.steps)) {

        setProgress(
          job.steps.map((step: ProgressStep) => ({
            name: step.name,
            status: step.status,
            message: step.message,
          })),
        );

      }

      if (
        job.status === "completed" ||
        job.status === "failed"
      ) {

        clearInterval(interval);

        setActiveJobId(null);

        setImporting(false);

      }

    } catch (error) {

      console.error(
        "Failed to get import progress:",
        error,
      );

    }

  }, 1000);

  return () => {

    clearInterval(interval);

  };

}, [activeJobId]);

  const countries = useMemo(() => {

    return [...new Set(

      competitions.map(c => c.country)

    )].sort();

  }, [competitions]);

  const leagues = useMemo(() => {

    return competitions.filter(

      c => c.country === selectedCountry

    );

  }, [competitions, selectedCountry]);

  const selectedCompetition = useMemo(() => {

  return competitions.find(

    c => String(c.id) === selectedLeague

  ) ?? null;

}, [competitions, selectedLeague]);

  async function handleImportSelected() {

  if (!selectedCompetition || !selectedSeason) {
    return;
  }

  const season =
    Number(selectedSeason);

  setImporting(true);

  setProgress([
    {
      name: "Preparing Import",
      status: "running",
      message: "Creating import job...",
    },
  ]);

  try {

    const job =
      await createImportJobFn({
        data: {
          leagueId: selectedCompetition.id,
          season: season,
        },
      });

    setActiveJobId(job.id);

    const result =
      await runPipelineFn({
        data: {
          apiLeagueId: selectedCompetition.id,
          season: season,
          jobId: job.id,
        },
      });

    if (!result.success) {
      console.error(
        "Import pipeline failed:",
        result,
      );
    }

  } catch (error) {

    console.error(
      "Failed to start import:",
      error,
    );

    setProgress([
      {
        name: "Import",
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown import error",
      },
    ]);

    setActiveJobId(null);
    setImporting(false);

  }

  }

  
function handleImportEverything() {

  setImporting(true);

  console.log("Import everything");

  setTimeout(() => {

    setImporting(false);

  }, 1500);

}

  return (

    <Card>

      <CardHeader>

        <CardTitle>

          Data Import Center

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-6">
        <Button
  type="button"
  onClick={() => {
    alert("Data Import Center click works");
  }}
>
  Test Click
</Button>

        <div className="grid gap-4 md:grid-cols-2">

          <div>

            <div className="mb-2 text-sm font-medium">

              Country

            </div>

            <select
  value={selectedCountry}
  onChange={(event) => {
    setSelectedCountry(event.target.value);
    setSelectedLeague("");
    setSelectedSeason("");
  }}
  disabled={loading || countries.length === 0}
  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
>
  <option value="">
    Select Country
  </option>

  {countries.map((country) => (
    <option
      key={country}
      value={country}
    >
      {country}
    </option>
  ))}
</select>

          </div>

          <div>

            <div className="mb-2 text-sm font-medium">
              Competition
            </div>

            <Select
  value={selectedLeague}
  onValueChange={(value) => {

    setSelectedLeague(value);

    setSelectedSeason("");

  }}
  disabled={!selectedCountry}
>

              <SelectTrigger>

                <SelectValue
                  placeholder="Select Competition"
                />

              </SelectTrigger>

              <SelectContent>

                {leagues.map((league) => (

                  <SelectItem
                    key={league.id}
                    value={String(league.id)}
                  >

                    {league.name}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>
          <div>

  <div className="mb-2 text-sm font-medium">
    Season
  </div>

  <Select
    value={selectedSeason}
    onValueChange={setSelectedSeason}
    disabled={!selectedLeague}
  >

    <SelectTrigger>

      <SelectValue
        placeholder="Select Season"
      />

    </SelectTrigger>

    <SelectContent>

      <SelectItem value="2024">
        2024
      </SelectItem>

      <SelectItem value="2023">
        2023
      </SelectItem>

      <SelectItem value="2022">
        2022
      </SelectItem>

    </SelectContent>

  </Select>

</div>

        </div>

        {loading && (

          <div className="text-sm text-muted-foreground">
            Loading competitions...
          </div>

        )}

        <CompetitionInfoCard
  competition={selectedCompetition}
/>
        
        <AvailableImports
  selected={selectedImports}
  onChange={setSelectedImports}
/>
        
        <ImportActions
  competitionId={
    selectedCompetition?.id ?? null
  }
  season={selectedSeason}
  selectedImports={selectedImports}
  loading={importing}
  onImportSelected={handleImportSelected}
  onImportEverything={handleImportEverything}
/>

        <ImportProgress
  steps={progress}
/>

        {!loading && competitions.length === 0 && (

          <div className="text-sm text-muted-foreground">
            No competitions found.
          </div>

        )}

      </CardContent>

    </Card>

  );

                }   
