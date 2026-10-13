export const estado = { sesion: null, usuario: null, consultas: [] };
export const authOptions = {};
export async function getServerSession() { return estado.sesion; }
export const prisma = {
  usuario: {
    async findUnique(consulta) {
      estado.consultas.push(consulta);
      return estado.usuario;
    },
  },
};
