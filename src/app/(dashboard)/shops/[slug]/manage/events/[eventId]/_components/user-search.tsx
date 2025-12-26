import { useState, useEffect, useRef } from 'react';
import { IconSearch, IconUser, IconLoader2 } from '@tabler/icons-react';
import { searchUsersPublicAction } from '@/features/users/actions';

import { cn } from '@/lib/utils';

export interface UserSearchProps {
    onSelect: (user: any) => void;
    placeholder?: string;
    excludeIds?: string[];
}

export function UserSearch({ onSelect, placeholder = "Ajouter un participant...", excludeIds = [] }: UserSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Simple debounce if hook not found, but let's assume standard react pattern
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            
            setIsLoading(true);
            try {
                const res = await searchUsersPublicAction(query);
                if (res?.users) {
                    const filtered = res.users.filter((u: any) => !excludeIds.includes(u.id));
                    setResults(filtered);
                    setIsOpen(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, excludeIds]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
             if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (user: any) => {
        onSelect(user);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-sm">
            <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full bg-dark-900 border border-dark-700 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <IconLoader2 className="animate-spin text-gray-500" size={16} />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-dark-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {results.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="w-full text-left px-4 py-2 hover:bg-dark-700 transition-colors flex items-center gap-3 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-gray-400 group-hover:bg-dark-500 group-hover:text-gray-300">
                                <IconUser size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-200">
                                    {user.prenom} {user.nom}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {user.bucque ? `${user.bucque} ` : ''}
                                    <span className="opacity-70">({user.username})</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
             {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-dark-700 rounded-md shadow-lg p-4 text-center text-sm text-gray-500">
                    Aucun utilisateur trouvé
                </div>
            )}
        </div>
    );
}
