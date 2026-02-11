import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from './useAuth';
import { toast } from 'sonner';

export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('nome');

            if (error) throw error;
            return data as unknown as UserProfile[];
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (user: Partial<UserProfile> & { id: string }) => {
            const { error } = await (supabase as any)
                .rpc('admin_update_user', {
                    target_user_id: user.id,
                    new_nome: user.nome,
                    new_role: user.role,
                    new_clinica_id: user.clinica_id
                });

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuário atualizado com sucesso!');
        },
        onError: (error: any) => {
            console.error('Error updating user:', error);
            const message = error.message || 'Erro de permissão no banco de dados';
            toast.error(`Erro ao atualizar usuário: ${message}`);
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await (supabase as any)
                .rpc('admin_delete_user', {
                    target_user_id: userId
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuário removido com sucesso!');
        },
        onError: (error: any) => {
            console.error('Error deleting user:', error);
            const message = error.message || 'Erro de permissão no banco de dados';
            toast.error(`Erro ao remover usuário: ${message}`);
        },
    });
};
