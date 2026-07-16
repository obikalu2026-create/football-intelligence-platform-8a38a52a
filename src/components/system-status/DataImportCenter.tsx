import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AvailableImports } from "./AvailableImports";
import { ImportActions } from "./ImportActions";


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

  const [loading, setLoading] =
    useState(true);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [selectedCountry, setSelectedCountry] =
    useState("");

  const [selectedLeague, setSelectedLeague] =
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

  function handleImportSelected() {

  setImporting(true);

  console.log("Competition:", selectedLeague);

  console.log("Imports:", selectedImports);

  setTimeout(() => {

    setImporting(false);

  }, 1500);

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

        <div className="grid gap-4 md:grid-cols-2">

          <div>

            <div className="mb-2 text-sm font-medium">

              Country

            </div>

            <Select
              value={selectedCountry}
              onValueChange={(value) => {

                setSelectedCountry(value);

                setSelectedLeague("");

              }}
            >

              <SelectTrigger>

                <SelectValue
                  placeholder="Select Country"
                />

              </SelectTrigger>

              <SelectContent>
  {countries.map((country) => (
    <SelectItem
      key={country}
      value={country}
    >
      {country}
    </SelectItem>
  ))}
</SelectContent>
             </Select>

          </div>

          <div>

            <div className="mb-2 text-sm font-medium">
              Competition
            </div>

            <Select
              value={selectedLeague}
              onValueChange={setSelectedLeague}
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
  selectedImports={selectedImports}
  loading={importing}
  onImportSelected={handleImportSelected}
  onImportEverything={handleImportEverything}
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
