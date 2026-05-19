import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";

const TermosServico = () => (
  <main className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        Voltar para login
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Termos de Serviço</h1>
      </div>

      <p className="text-muted-foreground mb-8">Última atualização: {new Date().getFullYear()}</p>

      <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Aceitação dos Termos</h2>
          <p>Ao acessar e utilizar a plataforma Kareon, você concorda em cumprir estes Termos de Serviço. Se não concordar, não utilize o serviço.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Descrição do Serviço</h2>
          <p>O Kareon é uma plataforma de gestão clínica destinada a terapeutas ocupacionais e clínicas pediátricas, oferecendo ferramentas de agendamento, registro de sessões, acompanhamento de evolução e geração de relatórios.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Cadastro e Conta</h2>
          <p>Você é responsável por manter a confidencialidade de suas credenciais. Notifique-nos imediatamente sobre qualquer uso não autorizado da sua conta.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Uso Adequado</h2>
          <p>É proibido usar a plataforma para fins ilegais, prejudiciais ou não autorizados. Reservamo-nos o direito de suspender contas que violem estas regras.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Pagamento e Assinatura</h2>
          <p>O acesso ao Kareon pode estar sujeito a planos de assinatura. Os valores, periodicidade e condições de pagamento são apresentados no momento da contratação.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Disponibilidade do Serviço</h2>
          <p>Trabalhamos para manter a plataforma disponível 24/7, mas não garantimos acesso ininterrupto. Manutenções programadas poderão ocorrer.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Alterações nos Termos</h2>
          <p>Podemos atualizar estes termos periodicamente. Notificações sobre mudanças significativas serão enviadas por email ou dentro da plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Contato</h2>
          <p>Em caso de dúvidas sobre estes termos, entre em contato pelo email suporte@kareon.com.</p>
        </section>
      </div>
    </div>
  </main>
);

export default TermosServico;
