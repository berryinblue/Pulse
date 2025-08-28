import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

interface FiltersProps {
  onFiltersChange: (filters: any) => void;
  isLoading?: boolean;
}

const availableTags = ["Social", "Career", "Fitness", "Learning", "Food"];
const campuses = [
  { value: "mountain-view", label: "Mountain View" },
  { value: "san-francisco", label: "San Francisco" },
  { value: "new-york", label: "New York" },
  { value: "austin", label: "Austin" },
];

export default function FiltersSidebar({ onFiltersChange, isLoading }: FiltersProps) {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    query: "",
    when: "week",
    inPerson: true,
    virtual: true,
    campus: "",
    tags: [] as string[],
  });

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    
    // Convert filters to API format
    const apiFilters: any = {};
    if (updated.query) apiFilters.query = updated.query;
    if (updated.tags.length > 0) apiFilters.tags = updated.tags.join(",");
    if (updated.campus && updated.campus !== "all") apiFilters.campus = updated.campus;
    
    // Convert when to date range
    const now = new Date();
    switch (updated.when) {
      case "today":
        apiFilters.from = new Date(now.setHours(0, 0, 0, 0));
        apiFilters.to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        apiFilters.from = now;
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        apiFilters.to = weekEnd;
        break;
      case "month":
        apiFilters.from = now;
        const monthEnd = new Date();
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        apiFilters.to = monthEnd;
        break;
    }
    
    // Handle virtual/in-person filter
    if (updated.virtual && !updated.inPerson) {
      apiFilters.virtual = true;
    } else if (updated.inPerson && !updated.virtual) {
      apiFilters.virtual = false;
    }
    
    onFiltersChange(apiFilters);
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };

  return (
    <aside className="w-full lg:w-80 flex-shrink-0">
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle>Filter Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search Events</Label>
            <div className="relative mt-2">
              <Input
                id="search"
                placeholder="Search by title or description..."
                value={filters.query}
                onChange={(e) => updateFilters({ query: e.target.value })}
                className="pl-10"
                data-testid="input-search"
              />
              <i className="fas fa-search absolute left-3 top-3 text-muted-foreground"></i>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <Label>When</Label>
            <RadioGroup
              value={filters.when}
              onValueChange={(when) => updateFilters({ when })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="today" data-testid="radio-today" />
                <Label htmlFor="today" className="text-sm">Today</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="week" data-testid="radio-week" />
                <Label htmlFor="week" className="text-sm">This Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="month" data-testid="radio-month" />
                <Label htmlFor="month" className="text-sm">This Month</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Location Type */}
          <div>
            <Label>Location</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="in-person"
                  checked={filters.inPerson}
                  onCheckedChange={(checked) => updateFilters({ inPerson: !!checked })}
                  data-testid="checkbox-in-person"
                />
                <Label htmlFor="in-person" className="text-sm">In-Person</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="virtual"
                  checked={filters.virtual}
                  onCheckedChange={(checked) => updateFilters({ virtual: !!checked })}
                  data-testid="checkbox-virtual"
                />
                <Label htmlFor="virtual" className="text-sm">Virtual</Label>
              </div>
            </div>
          </div>

          {/* Campus */}
          <div>
            <Label>Campus</Label>
            <Select value={filters.campus} onValueChange={(campus) => updateFilters({ campus })}>
              <SelectTrigger className="mt-2" data-testid="select-campus">
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {campuses.map((campus) => (
                  <SelectItem key={campus.value} value={campus.value}>
                    {campus.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.tags.includes(tag) ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => toggleTag(tag)}
                  data-testid={`tag-${tag.toLowerCase()}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Button 
            className="w-full"
            onClick={() => setLocation("/create")}
            data-testid="button-create-event"
          >
            <i className="fas fa-plus mr-2"></i>Create New Event
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
