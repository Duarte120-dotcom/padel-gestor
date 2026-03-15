# PádelGestor — App de gestión de torneos de pádel

## Setup completo paso a paso

---

## 1. Crear el proyecto localmente

```bash
npx create-next-app@14 padel-gestor --typescript --tailwind --eslint --app --src-dir
cd padel-gestor
```

Instalar dependencias adicionales:
```bash
npm install @supabase/supabase-js @supabase/ssr clsx
```

---

## 2. Configurar Supabase

1. Ir a [supabase.com](https://supabase.com) → crear cuenta → New Project
2. Nombre: `padel-gestor` | Region: South America (São Paulo)
3. Una vez creado, ir a **SQL Editor** → New Query
4. Pegar el contenido de `supabase_schema.sql` y ejecutar (Run)

---

## 3. Variables de entorno

Copiar `.env.local.example` como `.env.local`:

```bash
cp .env.local.example .env.local
```

Completar con los valores de **Supabase → Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon/public key

---

## 4. Copiar los archivos del proyecto

Copiar toda la carpeta `src/` al proyecto creado en el paso 1.
Copiar también `middleware.ts` a la raíz del proyecto.

---

## 5. Crear el primer usuario administrador

1. Ir a **Supabase → Authentication → Users → Invite user**
2. Ingresar el email del administrador principal
3. Después de que el usuario confirme el email, ir a **SQL Editor** y ejecutar:

```sql
update public.profiles
set role = 'admin', full_name = 'Admin Principal'
where id = (select id from auth.users where email = 'TU_EMAIL@ejemplo.com');
```

---

## 6. Correr el proyecto

```bash
npm run dev
```

Abrir http://localhost:3000 → va a redirigir al login.

---

## 7. Deploy en Vercel

```bash
npx vercel
```

Configurar las variables de entorno en **Vercel → Settings → Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

En Supabase, agregar la URL de producción en **Authentication → URL Configuration → Site URL**.

---

## Estructura del proyecto

```
padel-gestor/
├── middleware.ts                    ← Protección de rutas
├── src/
│   ├── app/
│   │   ├── login/page.tsx           ← Login
│   │   └── dashboard/
│   │       ├── layout.tsx           ← Layout con sidebar
│   │       ├── page.tsx             ← Listado de torneos
│   │       └── tournaments/[id]/
│   │           ├── page.tsx         ← Panel del torneo
│   │           └── categories/[catId]/
│   │               ├── groups/      ← Grupos y posiciones
│   │               ├── matches/     ← Carga de resultados
│   │               └── bracket/     ← Llave eliminatoria
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            ← Cliente browser
│   │   │   ├── server.ts            ← Cliente server
│   │   │   └── types.ts             ← Tipos TypeScript
│   │   ├── actions.ts               ← Server Actions (toda la lógica de DB)
│   │   └── tournament-logic/
│   │       ├── groups.ts            ← Generación de grupos
│   │       └── bracket.ts          ← Generación de llave
│   └── components/
│       ├── layout/Sidebar.tsx
│       ├── tournaments/
│       ├── categories/
│       ├── groups/
│       ├── matches/                 ← Módulo de carga de resultados
│       └── bracket/                 ← Visualización de llave
```

---

## Roles y permisos

| Acción                        | Admin | Colaborador |
|-------------------------------|-------|-------------|
| Crear/editar torneos          | ✓     | ✗           |
| Crear categorías              | ✓     | ✗           |
| Cargar/editar parejas         | ✓     | ✓           |
| Generar grupos                | ✓     | ✗           |
| Confirmar grupos              | ✓     | ✗           |
| Cargar resultados             | ✓     | ✓           |
| Generar llave                 | ✓     | ✗           |
| Confirmar llave               | ✓     | ✗           |
| Ver todo                      | ✓     | ✓           |

---

## Lógica de grupos

- Se priorizan grupos de 3
- Se usan grupos de 4 solo cuando el total no divide exactamente por 3
- Ejemplos:
  - 9 parejas → 3 grupos de 3
  - 10 parejas → 2 grupos de 3 + 1 grupo de 4
  - 11 parejas → 1 grupo de 3 + 2 grupos de 4
  - 12 parejas → 4 grupos de 3

## Lógica de llave

- Siempre se completa hasta la siguiente potencia de 2
- En primera ronda, se evita cruzar parejas del mismo grupo
- Los BYEs se asignan a las posiciones de menor ranking
- Una vez confirmada, la llave no se regenera automáticamente
