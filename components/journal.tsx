'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ChevronDown, Search, Tag, Star, Edit2, Check, X } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  timestamp: string;
  title: string;
  content: string;
  mood?: string;
  tags: string[];
  favorite: boolean;
}

const JOURNAL_STORAGE_KEY = 'journal-entries';

export function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: 'neutral',
    tags: '' as string,
  });
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    mood: 'neutral',
    tags: '' as string,
  });

  useEffect(() => {
    const saved = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load journal entries:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const moodOptions = ['great', 'good', 'neutral', 'bad', 'terrible'];

  const handleCreateEntry = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    const now = new Date();
    const today = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const tags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    setEntries([
      {
        id: Date.now().toString(),
        date: today,
        timestamp: now.toISOString(),
        title: formData.title,
        content: formData.content,
        mood: formData.mood,
        tags,
        favorite: false,
      },
      ...entries,
    ]);

    setFormData({ title: '', content: '', mood: 'neutral', tags: '' });
    setIsCreating(false);
  };

  const startEditing = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditData({
      title: entry.title,
      content: entry.content,
      mood: entry.mood || 'neutral',
      tags: entry.tags.join(', '),
    });
  };

  const saveEdit = (id: string) => {
    if (!editData.title.trim() || !editData.content.trim()) return;

    const tags = editData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    setEntries(entries.map(entry =>
      entry.id === id
        ? {
            ...entry,
            title: editData.title,
            content: editData.content,
            mood: editData.mood,
            tags,
          }
        : entry
    ));

    setEditingId(null);
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setEntries(entries.map(entry =>
      entry.id === id ? { ...entry, favorite: !entry.favorite } : entry
    ));
  };

  const moodEmoji = {
    great: '😄',
    good: '😊',
    neutral: '😐',
    bad: '😕',
    terrible: '😢',
  };

  const getFilteredEntries = () => {
    let filtered = entries;

    // Filter by favorites
    if (showFavorites) {
      filtered = filtered.filter(e => e.favorite);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(e =>
        selectedTags.some(tag => e.tags.includes(tag))
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query) ||
        e.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const allTags = Array.from(new Set(entries.flatMap(e => e.tags)));
  const filteredEntries = getFilteredEntries();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Journal</h2>
        <div className="flex gap-2">
          <Button
            variant={showFavorites ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavorites(!showFavorites)}
            className="hidden sm:flex"
          >
            <Star size={16} className="mr-2" />
            Favorites
          </Button>
          {/* Mobile-friendly large New Entry button */}
          <Button
            onClick={() => setIsCreating(!isCreating)}
            variant={isCreating ? 'outline' : 'default'}
            className="gap-2 min-h-[44px] px-6 text-base font-semibold"
            size="lg"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Entry</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="p-4 bg-card mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev =>
                      prev.includes(tag)
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Tag size={12} />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create Entry Form */}
      {isCreating && (
        <Card className="p-6 bg-card mb-6">
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Entry title..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Textarea
              placeholder="Write your thoughts here..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="min-h-32"
            />
            <Input
              type="text"
              placeholder="Tags (comma-separated)..."
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">How are you feeling?</label>
              <div className="flex gap-2">
                {moodOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => setFormData({ ...formData, mood: m })}
                    className={`text-2xl p-2 rounded-md transition-colors ${
                      formData.mood === m ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted'
                    }`}
                    title={m}
                  >
                    {moodEmoji[m as keyof typeof moodEmoji]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateEntry} className="flex-1">
                Save Entry
              </Button>
              <Button
                onClick={() => setIsCreating(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <Card className="p-8 text-center bg-card">
            <p className="text-muted-foreground">
              {entries.length === 0
                ? 'No journal entries yet. Start writing to reflect on your day!'
                : 'No entries match your search criteria.'}
            </p>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card
              key={entry.id}
              className="bg-card overflow-hidden"
            >
              <div className="p-4">
                {editingId === entry.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <Input
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="Entry title..."
                    />
                    <Textarea
                      value={editData.content}
                      onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                      placeholder="Entry content..."
                      className="min-h-32"
                    />
                    <Input
                      value={editData.tags}
                      onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                      placeholder="Tags (comma-separated)..."
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Mood</label>
                      <div className="flex gap-2">
                        {moodOptions.map((m) => (
                          <button
                            key={m}
                            onClick={() => setEditData({ ...editData, mood: m })}
                            className={`text-2xl p-2 rounded-md transition-colors ${
                              editData.mood === m ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted'
                            }`}
                          >
                            {moodEmoji[m as keyof typeof moodEmoji]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(entry.id)} className="flex-1">
                        <Check size={16} className="mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingId(null)}
                        variant="outline"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <button
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="w-full flex items-center justify-between hover:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <span className="text-2xl">
                          {moodEmoji[entry.mood as keyof typeof moodEmoji] || '📝'}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{entry.title}</p>
                            {entry.favorite && (
                              <Star size={16} className="text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.date}</p>
                          {entry.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {entry.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        size={20}
                        className={`text-muted-foreground transition-transform ${
                          expandedId === entry.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedId === entry.id && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                          {entry.content}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => toggleFavorite(entry.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Star
                              size={16}
                              className={entry.favorite ? 'fill-yellow-500 text-yellow-500' : ''}
                            />
                            {entry.favorite ? 'Unfavorite' : 'Favorite'}
                          </Button>
                          <Button
                            onClick={() => startEditing(entry)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Edit2 size={16} className="mr-2" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteEntry(entry.id)}
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Stats Footer */}
      {entries.length > 0 && (
        <Card className="mt-6 p-4 bg-card">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold text-foreground">{entries.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Favorites</p>
              <p className="text-2xl font-bold text-yellow-500">
                {entries.filter(e => e.favorite).length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tags Used</p>
              <p className="text-2xl font-bold text-foreground">{allTags.length || 0}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
