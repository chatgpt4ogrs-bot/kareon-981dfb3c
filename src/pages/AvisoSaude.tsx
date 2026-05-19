import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Stethoscope } from "lucide-react";

const AvisoSaude = () => (
  <main className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        Voltar para login
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Aviso de Saúde</h1>
      </div>

      <p className="text-muted-foreground mb-8">Última atualização: {new Date().getFullYear()}</p>

      <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Natureza da Plataforma</h2>
          <p>O Kareon é uma ferramenta de gestão e registro clínico. Não substitui o julgamento profissional de terapeutas ocupacionais, médicos ou outros profissionais de saúde.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Responsabilidade Profissional</h2>
          <p>Os profissionais cadastrados são integralmente responsáveis pelos registros, diagnósticos, planos terapêuticos e decisões clínicas tomadas durante o uso da plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Dados Clínicos Sensíveis</h2>
          <p>O tratamento de dados de saúde (incluindo prontuários e evoluções) é realizado com base no art. 11 da LGPD, observados os princípios de finalidade, adequação e segurança.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Sigilo e Confidencialidade</h2>
          <p>Todos os usuários devem manter o sigilo das informações dos pacientes. O compartilhamento de dados só deve ocorrer com autorização ou quando previsto em lei.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Emergências Médicas</h2>
          <p>O Kareon não deve ser usado para atendimento de emergências. Em situações de risco à vida, procure atendimento médico imediato.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Precisão dos Registros</h2>
          <p>Recomendamos que os registros sejam preenchidos de forma completa e precisa. A qualidade dos relatórios e do acompanhamento depende da fidelidade dos dados inseridos.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Contato</h2>
          <p>Para questões relacionadas a este aviso, entre em contato pelo email suporte@kareon.com.</p>
        </section>
      </div>
    </div>
  </main>
);

export default AvisoSaude;
