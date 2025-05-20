const axios = require('axios');

const token = ""; // token user
const guildId = '';
const limit = 100; 
let before = '';

const welcomeMessage = "";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRequestsAndSendInterviews() {
  try {
    console.log('🔍 Début du traitement de toutes les candidatures...');
    
    let hasMoreRequests = true;
    let totalProcessed = 0;
    
    while (hasMoreRequests) {
      console.log(`🔄 Récupération du lot suivant (before: ${before})`);
      
      const res = await axios.get(`https://discord.com/api/v9/guilds/${guildId}/requests`, {
        params: {
          status: 'SUBMITTED', 
          limit,
          before
        },
        headers: {
          Authorization: `${token}`,
        }
      });
      
      const requests = res.data.guild_join_requests || [];
      console.log(`💡 ${requests.length} candidatures trouvées dans ce lot`);
      
      if (requests.length === 0) {
        hasMoreRequests = false;
        console.log('👍 Toutes les candidatures ont été traitées');
        break;
      }
      
      if (requests.length > 0) {
        before = requests[requests.length - 1].join_request_id;
      }
      
      for (const request of requests) {
        try {
          const requestId = request.join_request_id;
          if (!requestId) {
            console.log("⚠️ Candidature sans ID détectée:", request);
            continue;
          }

          console.log(`🔄 Traitement de la candidature: ${requestId}`);
          
          const interviewResponse = await axios.post(`https://discord.com/api/v9/join-requests/${requestId}/interview`, {}, {
            headers: {
              Authorization: `${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`✅ Interview ouverte pour: ${requestId}`);
          
          const joinRequestDetails = await axios.get(`https://discord.com/api/v9/join-requests/${requestId}`, {
            headers: {
              Authorization: `${token}`
            }
          });
          
          const channelId = joinRequestDetails.data.interview_channel_id;
          if (!channelId) {
            console.log(`⚠️ Pas de channel trouvé pour la candidature ${requestId}.`);
            continue;
          }
          
          console.log(`🔍 Channel ID trouvé: ${channelId}`);
          
          await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, {
            content: welcomeMessage
          }, {
            headers: {
              Authorization: `${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`📨 Message envoyé dans le canal de candidature: ${channelId}`);
          totalProcessed++;
          
          await delay(1500);
        } catch (err) {
          console.error(`❌ Erreur lors du traitement de la candidature:`, err.response?.data || err.message);

          if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Données:', JSON.stringify(err.response.data, null, 2));
            
            if (err.response.status === 429) {
              const retryAfter = err.response.data.retry_after || 5;
              console.log(`⏱️ Rate limit atteint. Attente de ${retryAfter} secondes...`);
              await delay(retryAfter * 1000 + 500);
            }
          }
        }
      }
      
      await delay(2000);
    }

    console.log(`✅ Traitement terminé. ${totalProcessed} candidatures traitées au total.`);

  } catch (err) {
    console.error('❌ Erreur générale lors de la récupération des candidatures:', err.response?.data || err.message);
    if (err.response && err.response.status === 401) {
      console.error('🔑 Authentification échouée. Vérifiez votre token.');
    } else if (err.response && err.response.status === 403) {
      console.error('🚫 Permissions insuffisantes. Vérifiez les permissions du compte.');
    }
  }
}

fetchRequestsAndSendInterviews();
