import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Checkbox } from "@/components/ui/checkbox";

interface AvailableImportsProps {

  selected: string[];

  onChange: (items: string[]) => void;

}

const IMPORT_OPTIONS = [

  "Competition",

  "Seasons",

  "Teams",

  "Venues",

  "Fixtures",

  "Standings",

  "Team Statistics",

  "Players",

  "Injuries",

  "Transfers",

  "Coaches",

  "Odds",

  "Predictions",

];

export function AvailableImports({

  selected,

  onChange,

}: AvailableImportsProps) {

  function toggle(item: string) {

    if (selected.includes(item)) {

      onChange(

        selected.filter(i => i !== item)

      );

    } else {

      onChange([

        ...selected,

        item,

      ]);

    }

  }

  return (

    <Card>

      <CardHeader>

        <CardTitle>

          Available Data

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-3">

        {IMPORT_OPTIONS.map(item => (

          <div
            key={item}
            className="flex items-center gap-3"
          >

            <Checkbox

              checked={selected.includes(item)}

              onCheckedChange={() => toggle(item)}

            />

            <span>

              {item}

            </span>

          </div>

        ))}

      </CardContent>

    </Card>

  );

}
