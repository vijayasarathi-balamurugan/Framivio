import javax.tools.*;
import com.sun.source.util.JavacTask;
import java.util.*;
import java.nio.file.*;
public class ParseJava {
    public static void main(String[] args) throws Exception {
        JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
        if(compiler==null)throw new IllegalStateException("JDK compiler unavailable");
        DiagnosticCollector<JavaFileObject> diagnostics=new DiagnosticCollector<>();
        try(StandardJavaFileManager manager=compiler.getStandardFileManager(diagnostics,null,null)) {
            List<String> paths=new ArrayList<>();
            try(var files=Files.walk(Path.of("app/src"))){files.filter(p->p.toString().endsWith(".java")).forEach(p->paths.add(p.toString()));}
            JavacTask task=(JavacTask)compiler.getTask(null,manager,diagnostics,List.of("-proc:none"),null,manager.getJavaFileObjectsFromStrings(paths));
            task.parse();
            for(var d:diagnostics.getDiagnostics())if(d.getKind()==Diagnostic.Kind.ERROR)throw new AssertionError(d.toString());
            System.out.println("Java syntax parse passed: "+paths.size()+" files. This is NOT Android type checking or compilation.");
        }
    }
}
