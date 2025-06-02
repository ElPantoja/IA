from langchain_huggingface import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_ollama import OllamaLLM

# Cargar embeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Cargar FAISS local
nombre_vector = "aborto_faiss"
vector_store = FAISS.load_local(nombre_vector, embeddings, allow_dangerous_deserialization=True)

# Cargar modelo local con Ollama
llm = OllamaLLM(model="llama3")

# Crear cadena de preguntas/respuestas
chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vector_store.as_retriever()
)

# Chat interactivo
while True:
    pregunta = input("\nEscribe tu pregunta (o 'salir' para terminar): ")
    if pregunta.lower() == "salir":
        print("Hasta luego :)")
        break
    respuesta = chain.invoke(pregunta)
    print(f"Respuesta: {respuesta}")
