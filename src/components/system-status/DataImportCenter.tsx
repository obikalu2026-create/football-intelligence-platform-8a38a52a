import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { getCompetitions } from "@/lib/competitions.functions";

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
    </CardContent>
</Card>
);
 }
